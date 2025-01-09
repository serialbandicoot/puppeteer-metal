import torch
from PIL import Image, ImageDraw
from torchvision import transforms
from tqdm.auto import tqdm
import easyocr
import numpy as np
import pandas as pd
from transformers import AutoModelForObjectDetection, TableTransformerForObjectDetection


class TableAnalyzer:
    def __init__(self, device=None):
        self.device = device or ("cuda" if torch.cuda.is_available() else "cpu")
        self.detection_model = AutoModelForObjectDetection.from_pretrained(
            "microsoft/table-transformer-detection", revision="no_timm"
        ).to(self.device)
        self.structure_model = TableTransformerForObjectDetection.from_pretrained(
            "microsoft/table-structure-recognition-v1.1-all"
        ).to(self.device)

        self.detection_transform = transforms.Compose([
            MaxResize(800),
            transforms.ToTensor(),
            transforms.Normalize([0.485, 0.456, 0.406], [0.229, 0.224, 0.225])
        ])

        self.structure_transform = transforms.Compose([
            MaxResize(1000),
            transforms.ToTensor(),
            transforms.Normalize([0.485, 0.456, 0.406], [0.229, 0.224, 0.225])
        ])

        self.reader = easyocr.Reader(['en'])
        self.detection_thresholds = {"table": 0.5, "table rotated": 0.5, "no object": 10}

    def preprocess_image(self, image_path):
        image = Image.open(image_path).convert("RGB")
        return image

    def detect_tables(self, image):
        pixel_values = self.detection_transform(image).unsqueeze(0).to(self.device)
        with torch.no_grad():
            outputs = self.detection_model(pixel_values)
        id2label = self.detection_model.config.id2label
        id2label[len(id2label)] = "no object"
        objects = self.outputs_to_objects(outputs, image.size, id2label)
        return objects

    def outputs_to_objects(self, outputs, img_size, id2label):
        def box_cxcywh_to_xyxy(x):
            x_c, y_c, w, h = x.unbind(-1)
            b = [(x_c - 0.5 * w), (y_c - 0.5 * h), (x_c + 0.5 * w), (y_c + 0.5 * h)]
            return torch.stack(b, dim=1)

        def rescale_bboxes(out_bbox, size):
            img_w, img_h = size
            b = box_cxcywh_to_xyxy(out_bbox)
            b = b * torch.tensor([img_w, img_h, img_w, img_h], dtype=torch.float32)
            return b

        logits = outputs.logits.softmax(-1)
        pred_labels = logits.max(-1).indices[0].cpu().numpy()
        pred_scores = logits.max(-1).values[0].cpu().numpy()
        pred_bboxes = outputs.pred_boxes[0].cpu()
        pred_bboxes = [bbox.tolist() for bbox in rescale_bboxes(pred_bboxes, img_size)]

        objects = [
            {"label": id2label[label], "score": float(score), "bbox": bbox}
            for label, score, bbox in zip(pred_labels, pred_scores, pred_bboxes)
            if id2label[label] != "no object" and score >= 0.5
        ]
        return objects

    def crop_table(self, image, objects):
        for obj in objects:
            if obj['label'] in ["table", "table rotated"]:
                bbox = obj['bbox']
                return image.crop([bbox[0], bbox[1], bbox[2], bbox[3]])
        raise ValueError("No table detected in the image.")

    def recognize_structure(self, cropped_table):
        pixel_values = self.structure_transform(cropped_table).unsqueeze(0).to(self.device)
        with torch.no_grad():
            outputs = self.structure_model(pixel_values)
        id2label = self.structure_model.config.id2label
        id2label[len(id2label)] = "no object"
        return self.outputs_to_objects(outputs, cropped_table.size, id2label)

    def extract_table_data(self, cropped_table, cell_coordinates):
        data = {}
        max_columns = 0

        for row_idx, row in enumerate(tqdm(cell_coordinates)):
            row_text = []
            for cell in row["cells"]:
                cell_image = np.array(cropped_table.crop(cell["cell"]))
                ocr_result = self.reader.readtext(cell_image)
                text = " ".join([item[1] for item in ocr_result]) if ocr_result else ""
                row_text.append(text)

            max_columns = max(max_columns, len(row_text))
            data[row_idx] = row_text

        for row_idx in data.keys():
            data[row_idx] += [""] * (max_columns - len(data[row_idx]))

        return pd.DataFrame.from_dict(data, orient="index")

    def __call__(self, image_path):
        image = self.preprocess_image(image_path)
        table_objects = self.detect_tables(image)
        cropped_table = self.crop_table(image, table_objects)
        cell_objects = self.recognize_structure(cropped_table)
        cell_coordinates = self.get_cell_coordinates_by_row(cell_objects)
        dataframe = self.extract_table_data(cropped_table, cell_coordinates)
        return dataframe

    @staticmethod
    def get_cell_coordinates_by_row(objects):
        rows = [obj for obj in objects if obj['label'] == "table row"]
        cols = [obj for obj in objects if obj['label'] == "table column"]

        rows.sort(key=lambda r: r['bbox'][1])
        cols.sort(key=lambda c: c['bbox'][0])

        def cell_bbox(row, col):
            return [col['bbox'][0], row['bbox'][1], col['bbox'][2], row['bbox'][3]]

        return [
            {"row": row['bbox'], "cells": [{"cell": cell_bbox(row, col)} for col in cols]}
            for row in rows
        ]


class MaxResize:
    def __init__(self, max_size):
        self.max_size = max_size

    def __call__(self, image):
        width, height = image.size
        max_dim = max(width, height)
        scale = self.max_size / max_dim
        return image.resize((int(width * scale), int(height * scale)))
