---
layout: page
title: Software
permalink: /software/
---

# Current Projects

## pycemrg
Modular Python library suite for cardiovascular research engineering. Features contract-driven architecture, CLI tooling, configuration-based workflows, and Docker-based deployment. Maintained under the [OpenHeartDevelopers](https://github.com/OpenHeartDevelopers) organisation across four specialised repositories covering image analysis, interpolation, model creation, and core utilities.

## CardioForm
[CardioForm](https://github.com/OpenHeartDevelopers/cardio-form) is a containerised ML inference service for automated cardiac segmentation. Designed to enable non-technical lab members to run segmentation workflows without ML expertise. Features model versioning via ModelManager, output validation, CLI orchestration, and Docker deployment.

## cardioscar
[cardioscar](https://github.com/alonsoJASL/cardioscar) is a production refactor of a collaborator's published TensorFlow training pipeline for ventricular scar interpolation. Migrated to PyTorch with dataclass contracts, type-annotated APIs, comprehensive testing, and CLI tooling. Achieved a 36x training speedup (3.5 hours to 5.8 minutes) while maintaining statistical equivalence with the original model (r=0.79, MAE 0.052). Reduced model size 6.6x through architectural simplification. Original model architecture credit: Silvaet al.; engineering transformation documented in this repository.

## CemrgApp
[CemrgApp](https://github.com/CemrgAppDevelopers/CemrgApp) is a C++ clinical imaging platform built on MITK, enabling clinicians to perform cardiac image analysis through intuitive workflows. Used across more than 40 international cardiovascular research studies.

---

# Historical Projects

## macrosight
[macrosight](https://github.com/alonsoJASL/macrosight) is a MATLAB package for the analysis of overlapping macrophages in 3-layered microscopy images, adapting the PhagoSight algorithms for cells with overlapping boundaries.

## anglegram
[anglegram](https://github.com/alonsoJASL/matlab.anglegram) is a MATLAB tool for multiscale angle measurement of image boundaries, developed to detect junctions in binary objects.

## SplitVent
[SplitVent](https://github.com/splitvent/splitvent) is a simulated single-ventilator/dual-patient ventilation strategy developed during the COVID-19 pandemic, published in Royal Society Open Science.