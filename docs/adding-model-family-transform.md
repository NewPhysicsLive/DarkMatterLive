# Adding a Model-Family Transform

This guide documents how a new deterministic transformation module should be added to the backend scaffold.

The objective is to keep model-specific renormalization logic explicit, reviewable, and versioned. AI assistance may help identify relevant source material or suggest mappings, but the transformation itself must be deterministic code with documented assumptions.

## Current transform structure

Relevant files:

- `backend/src/dml_backend/pipelines/transforms/base.py`
- `backend/src/dml_backend/pipelines/transforms/bc1.py`

The shared base layer provides:

- `TransformationContext`
- `TransformationResult`
- `DeterministicTransform`

Each model-family transform should:

- declare the supported model family
- define when the transform applies
- return a transformed `CurvePayload`
- return a `TransformationRecord` capturing provenance

## Required inputs before implementing a transform

Before writing code, collect and document:

- the model family name
- the exact source observable being transformed
- the target observable or parameter space
- the formula or algorithm reference
- every numerical assumption required by the transformation
- any validity limits, caveats, or excluded regimes

Do not start from a vague statement such as “rescale to BC1 convention.” The formula, assumptions, and allowed input regime need to be explicit enough for an expert reviewer to evaluate line by line.

## Implementation steps

1. Create a new module under `backend/src/dml_backend/pipelines/transforms/`, for example `bc2.py`.
2. Add a class deriving from `DeterministicTransform`.
3. Implement `applies_to` so it rejects unsupported curves clearly.
4. Implement `run` so it:
   - computes the transformed points deterministically
   - updates the output curve identity and origin
   - appends transformation assumptions
   - emits a `TransformationRecord` using `build_record`
5. Record the method name, code version, parameters, and formula reference in the `TransformationContext`.
6. Keep the code side-effect free. A transform should compute and return results, not write files directly.

## Minimum review expectations

Every transform PR should include:

- a description of the physics mapping being implemented
- source references for the formula or algorithm
- a list of assumptions introduced in code
- one or more worked examples with expected outputs
- tests or validation checks against known reference values

## Suggested code pattern

```python
from dml_backend.domain.models import ArtifactOrigin, CurvePayload
from dml_backend.pipelines.transforms.base import (
    DeterministicTransform,
    TransformationContext,
    TransformationResult,
)


class BCXRenormalizationTransform(DeterministicTransform):
    model_family = "BCX"

    def applies_to(self, curve: CurvePayload) -> bool:
        return curve.categories.get("modelFamily") == self.model_family

    def run(self, curve: CurvePayload, context: TransformationContext) -> TransformationResult:
        transformed_points = [
            point.model_copy(update={"x": point.x, "y": point.y})
            for point in curve.points
        ]
        output_curve = curve.model_copy(
            update={
                "curve_id": f"{curve.curve_id}-renormalized",
                "origin": ArtifactOrigin.RENORMALIZED,
                "points": transformed_points,
                "assumptions": [*curve.assumptions, *context.assumptions],
            }
        )
        record = self.build_record(curve.curve_id, output_curve.curve_id, context)
        return TransformationResult(output_curve=output_curve, record=record)
```

## Testing guidance

The repository does not yet contain a transform test suite, but new model-family transforms should be written with tests in mind.

Recommended tests for each transform:

- it accepts supported curves and rejects unsupported ones
- it preserves monotonicity or ordering where physically expected
- it records provenance consistently
- it reproduces a known reference transformation within agreed tolerances
- it fails loudly when required assumptions or parameters are missing

## Anti-patterns

Do not:

- hide a formula in comments without implementing it explicitly
- fetch remote data during transformation
- embed reviewer decisions into transform logic
- change scientific meaning without recording it in `TransformationContext`
- silently clamp, smooth, or invent points without documentation and approval

## Related documentation

- `docs/data-platform-architecture.md`
- `docs/implementation-status.md`
- `backend/README.md`
