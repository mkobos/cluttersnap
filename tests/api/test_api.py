import io

import pytest
from PIL import Image
from fastapi.testclient import TestClient


def make_test_jpeg(width: int = 100, height: int = 80) -> bytes:
    img = Image.new("RGB", (width, height), color=(128, 128, 128))
    buf = io.BytesIO()
    img.save(buf, format="JPEG")
    return buf.getvalue()


@pytest.fixture()
def client():
    from api.index import app

    return TestClient(app)


def test_valid_jpeg_returns_score_and_heatmap(client):
    jpeg_data = make_test_jpeg(100, 80)
    response = client.post(
        "/api/analyze",
        files={"image": ("photo.jpg", jpeg_data, "image/jpeg")},
    )
    assert response.status_code == 200
    body = response.json()
    assert "score" in body
    assert isinstance(body["score"], (int, float))
    assert 1.0 <= body["score"] <= 10.0
    assert "heatmap" in body
    assert isinstance(body["heatmap"], list)
    assert isinstance(body["heatmap"][0], list)


def test_invalid_data_returns_400(client):
    response = client.post(
        "/api/analyze",
        files={"image": ("bad.jpg", b"not-an-image", "image/jpeg")},
    )
    assert response.status_code == 400


def test_heatmap_dimensions_match_input(client):
    width, height = 120, 90
    jpeg_data = make_test_jpeg(width, height)
    response = client.post(
        "/api/analyze",
        files={"image": ("photo.jpg", jpeg_data, "image/jpeg")},
    )
    assert response.status_code == 200
    heatmap = response.json()["heatmap"]
    assert len(heatmap) == height
    assert len(heatmap[0]) == width
