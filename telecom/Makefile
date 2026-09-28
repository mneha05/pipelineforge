PYTHON ?= python3
DATA ?= data/cdr.csv

.PHONY: demo generate network subscribers test

demo: generate network subscribers

generate:
	$(PYTHON) data/generate_synthetic_cdr.py --rows 50000 --out $(DATA)

network:
	$(PYTHON) analytics/network_quality.py $(DATA)

subscribers:
	$(PYTHON) analytics/subscriber_segments.py $(DATA)

test:
	pytest -q tests
