from fastapi.testclient import TestClient
from PIL import Image
import io
import torch

import main


class FakeProcessor:
    def __call__(self, images, return_tensors=None):
        return {"pixel_values": torch.zeros((1, 3, 224, 224))}


class FakeModel:
    def __init__(self, label_zero):
        self.config = type("Config", (), {"id2label": {0: label_zero, 1: "other"}})

    def to(self, device):
        return self

    def eval(self):
        return self

    def __call__(self, **kwargs):
        return type("Outputs", (), {"logits": torch.tensor([[2.0, 1.0]])})


def setup_module(module):
    main.flux_processor = FakeProcessor()
    main.flux_model = FakeModel("Flux.1_Generated")
    main.general_processor = FakeProcessor()
    main.general_model = FakeModel("ai")


client = TestClient(main.app)


def test_home():
    response = client.get("/")
    assert response.status_code == 200
    assert "status" in response.json()


def test_status():
    response = client.get("/status")
    assert response.status_code == 200
    payload = response.json()
    assert payload["models_loaded"] is True
    assert "device" in payload


def test_detect_rejects_non_image():
    response = client.post(
        "/detect",
        files={"file": ("note.txt", b"hello", "text/plain")},
    )
    assert response.status_code == 415


def test_detect_image_success():
    image = Image.new("RGB", (16, 16), color=(255, 0, 0))
    buffer = io.BytesIO()
    image.save(buffer, format="PNG")
    buffer.seek(0)

    response = client.post(
        "/detect",
        files={"file": ("sample.png", buffer.read(), "image/png")},
    )

    assert response.status_code == 200
    payload = response.json()
    assert isinstance(payload, list)
    labels = {item["label"] for item in payload}
    assert labels == {"AI-Generated", "Real"}
