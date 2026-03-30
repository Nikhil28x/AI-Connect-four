K = 32
DEFAULT_ELO = 1200


def expected_score(rating_a: int, rating_b: int) -> float:
    return 1 / (1 + 10 ** ((rating_b - rating_a) / 400))


def new_ratings(rating_a: int, rating_b: int, result: float) -> tuple[int, int]:
    ea = expected_score(rating_a, rating_b)
    eb = expected_score(rating_b, rating_a)
    new_a = round(rating_a + K * (result - ea))
    new_b = round(rating_b + K * ((1 - result) - eb))
    return new_a, new_b
