from dataclasses import dataclass


@dataclass
class AnalysisResult:
    score: float
    heatmap: list[list[float]]
