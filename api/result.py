from dataclasses import dataclass


@dataclass
class Result:
    score: float
    heatmap: list[list[float]]
