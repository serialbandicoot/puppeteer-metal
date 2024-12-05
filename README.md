# puppeteer-metal

## Roboflow Workflow Models

Fork these!

https://app.roboflow.com/workflows/embed/eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ3b3JrZmxvd0lkIjoiVFJSNll3cFhvRVhQMllBU1c5R2giLCJ3b3Jrc3BhY2VJZCI6Imd3WFUybVF2MW1kZUc4N1ZXRHN0blI4M1A0UzIiLCJ1c2VySWQiOiJnd1hVMm1RdjFtZGVHODdWV0RzdG5SODNQNFMyIiwiaWF0IjoxNzMzNDIxNTI4fQ.oWMnpi9DGkWXdD1CG-qc1G2t56qqqlfngw9unxaTNM0

https://app.roboflow.com/workflows/embed/eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ3b3JrZmxvd0lkIjoiajF5TW5SQXRxckVBdDA2Y3VCRXMiLCJ3b3Jrc3BhY2VJZCI6Imd3WFUybVF2MW1kZUc4N1ZXRHN0blI4M1A0UzIiLCJ1c2VySWQiOiJnd1hVMm1RdjFtZGVHODdWV0RzdG5SODNQNFMyIiwiaWF0IjoxNzMzNDIxNDkyfQ.akIe8QsrXH-jHjC68ZboZv7wKWpBaPxRI0Z_udneM0Q

## Docker and Inference
`pip install inference-cli && inference server start`

Get a Roboflow API Key and replace the following in app.py

```client = InferenceHTTPClient(
    api_url="http://localhost:9001", # use local inference server
    api_key="QWERTYUIOPASDFGHJKLZXCVBNM123456" # use the API key from the inference server
)```

`python roboflow-server/app.py` to start the Workflow Server

## Tests
I use vscode!