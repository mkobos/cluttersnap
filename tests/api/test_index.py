import io
import os
import pytest
import numpy as np
from PIL import Image
from fastapi.testclient import TestClient


def make_jpeg_bytes(width: int = 100, height: int = 80) -> bytes:
    img = Image.fromarray(np.full((height, width, 3), 128, dtype=np.uint8))
    buf = io.BytesIO()
    img.save(buf, format="JPEG")
    return buf.getvalue()


@pytest.fixture(autouse=True)
def use_mock_model(monkeypatch):
    monkeypatch.setenv("USE_MOCK_MODEL", "true")


@pytest.fixture
def client():
    from api.index import app

    return TestClient(app)


def test_analyze_returns_200(client):
    response = client.post(
        "/api/analyze",
        files={"image": ("room.jpg", make_jpeg_bytes(), "image/jpeg")},
    )
    assert response.status_code == 200


def test_score_is_in_valid_range(client):
    response = client.post(
        "/api/analyze",
        files={"image": ("room.jpg", make_jpeg_bytes(), "image/jpeg")},
    )
    data = response.json()
    assert "score" in data
    assert 1.0 <= data["score"] <= 10.0


def test_heatmap_matches_input_dimensions(client):
    jpeg = make_jpeg_bytes(width=160, height=120)
    response = client.post(
        "/api/analyze",
        files={"image": ("room.jpg", jpeg, "image/jpeg")},
    )
    data = response.json()
    assert "heatmap" in data
    assert len(data["heatmap"]) == 120  # height
    assert len(data["heatmap"][0]) == 160  # width


def test_heatmap_values_in_0_1(client):
    response = client.post(
        "/api/analyze",
        files={"image": ("room.jpg", make_jpeg_bytes(), "image/jpeg")},
    )
    heatmap = response.json()["heatmap"]
    flat = [v for row in heatmap for v in row]
    assert all(0.0 <= v <= 1.0 for v in flat)


def test_invalid_image_returns_400(client):
    response = client.post(
        "/api/analyze",
        files={"image": ("bad.jpg", b"not an image", "image/jpeg")},
    )
    assert response.status_code == 400
