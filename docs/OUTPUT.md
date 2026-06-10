# SDD Kit — Output de Tests

**Proyecto:** UX Great Prototype (`ux_great_prototype/`)
**SDD Kit:** `sdd-kit/` (submodule)
**Fecha:** 2026-05-26

---

## Suite completo: 216 tests

```bash
$ python -m pytest sdd-kit/tests/ -v --tb=line
```

```
============================= test session starts ==============================
platform linux -- Python 3.8.17, pytest-8.3.5, pluggy-1.5.0
cachedir: .pytest_cache
rootdir: /mnt/c/Users/NadiaUjovich/ux_great_prototype
collecting ... collected 216 items
```

### Allocation (27 tests)

```
sdd-kit/tests/test_allocation.py::test_permissions PASSED
sdd-kit/tests/test_allocation.py::test_eligibility PASSED
sdd-kit/tests/test_allocation.py::test_societes PASSED
sdd-kit/tests/test_allocation.py::test_fte_rates PASSED
sdd-kit/tests/test_allocation.py::test_tsa_rates PASSED
sdd-kit/tests/test_allocation.py::test_calculate_fte_ke PASSED
sdd-kit/tests/test_allocation.py::test_calculate_tsa_ke PASSED
sdd-kit/tests/test_allocation.py::test_tc_distribution PASSED
sdd-kit/tests/test_allocation.py::test_tc_distribution_uneven PASSED
sdd-kit/tests/test_allocation.py::test_tc_distribution_zero_fte PASSED
sdd-kit/tests/test_allocation.py::test_split_valid PASSED
sdd-kit/tests/test_allocation.py::test_split_invalid_total PASSED
sdd-kit/tests/test_allocation.py::test_hproject_routing_brasil PASSED
sdd-kit/tests/test_allocation.py::test_hproject_routing_valladolid PASSED
sdd-kit/tests/test_allocation.py::test_hproject_routing_bucarest PASSED
sdd-kit/tests/test_allocation.py::test_hproject_no_routing PASSED
sdd-kit/tests/test_allocation.py::test_16_rules PASSED
sdd-kit/tests/test_allocation.py::test_permission_checker PASSED
sdd-kit/tests/test_allocation.py::test_eligibility_filter PASSED
sdd-kit/tests/test_allocation.py::test_rule_matcher_with_empty_rules PASSED
sdd-kit/tests/test_allocation.py::test_rule_matcher_skips_assigned PASSED
sdd-kit/tests/test_allocation.py::test_ke_calculator PASSED
sdd-kit/tests/test_allocation.py::test_tc_handler PASSED
sdd-kit/tests/test_allocation.py::test_save_validator PASSED
sdd-kit/tests/test_allocation.py::test_save_validator_ok PASSED
sdd-kit/tests/test_allocation.py::test_bulk_assigner PASSED
sdd-kit/tests/test_allocation.py::test_split_handler PASSED
```

### Estimation Review (35 tests)

```
sdd-kit/tests/test_estimation_review.py::TestEstimationReviewPermissions::test_all_roles_have_permissions PASSED
sdd-kit/tests/test_estimation_review.py::TestEstimationReviewPermissions::test_pmo_can_send_to_hvt PASSED
sdd-kit/tests/test_estimation_review.py::TestEstimationReviewPermissions::test_admin_can_send_to_hvt PASSED
sdd-kit/tests/test_estimation_review.py::TestEstimationReviewPermissions::test_engineer_cannot_send_to_hvt PASSED
sdd-kit/tests/test_estimation_review.py::TestEstimationReviewPermissions::test_cpo_cannot_send_to_hvt PASSED
sdd-kit/tests/test_estimation_review.py::TestEstimationReviewPermissions::test_engineer_sees_only_own_rows PASSED
sdd-kit/tests/test_estimation_review.py::TestEstimationReviewPermissions::test_all_roles_can_view PASSED
sdd-kit/tests/test_estimation_review.py::TestEstimationReviewPermissions::test_all_roles_can_export_csv PASSED
sdd-kit/tests/test_estimation_review.py::TestSendEligibility::test_only_estimated_is_eligible PASSED
sdd-kit/tests/test_estimation_review.py::TestSendEligibility::test_other_statuses_not_eligible PASSED
sdd-kit/tests/test_estimation_review.py::TestApprovalColumns::test_engineer_approval_map_covers_all_statuses PASSED
sdd-kit/tests/test_estimation_review.py::TestApprovalColumns::test_cpo_approval_map_covers_all_statuses PASSED
sdd-kit/tests/test_estimation_review.py::TestApprovalColumns::test_estimated_shows_engineer_check PASSED
sdd-kit/tests/test_estimation_review.py::TestApprovalColumns::test_estimated_shows_not_yet_sent_for_cpo PASSED
sdd-kit/tests/test_estimation_review.py::TestApprovalColumns::test_sent_shows_pending_for_cpo PASSED
sdd-kit/tests/test_estimation_review.py::TestApprovalColumns::test_approved_shows_approved_for_cpo PASSED
sdd-kit/tests/test_estimation_review.py::TestApprovalColumns::test_rejected_shows_rejected_for_cpo PASSED
sdd-kit/tests/test_estimation_review.py::TestApprovalColumns::test_todo_shows_dash_for_both PASSED
sdd-kit/tests/test_estimation_review.py::TestHVTCallbackProcessing::test_approval_transitions_to_approved PASSED
sdd-kit/tests/test_estimation_review.py::TestHVTCallbackProcessing::test_rejection_transitions_to_rejected PASSED
sdd-kit/tests/test_estimation_review.py::TestHVTCallbackProcessing::test_approval_no_comment PASSED
sdd-kit/tests/test_estimation_review.py::TestEstimationReviewBusinessRules::test_ten_erev_rules PASSED
sdd-kit/tests/test_estimation_review.py::TestEstimationReviewBusinessRules::test_total_rules_27 PASSED
sdd-kit/tests/test_estimation_review.py::TestEstimationReviewBusinessRules::test_read_only_rule_exists PASSED
sdd-kit/tests/test_estimation_review.py::TestEstimationReviewBusinessRules::test_sent_irreversible_rule PASSED
sdd-kit/tests/test_estimation_review.py::TestPendingDefinitions::test_three_pending_definitions PASSED
sdd-kit/tests/test_estimation_review.py::TestPendingDefinitions::test_erev01_is_blocking PASSED
sdd-kit/tests/test_estimation_review.py::TestPendingDefinitions::test_erev02_is_blocking PASSED
sdd-kit/tests/test_estimation_review.py::TestPendingDefinitions::test_erev03_is_not_blocking PASSED
sdd-kit/tests/test_estimation_review.py::TestEstimationReviewPermissionCheckerModule::test_pmo_can_send_to_hvt PASSED
sdd-kit/tests/test_estimation_review.py::TestEstimationReviewPermissionCheckerModule::test_admin_can_send_to_hvt PASSED
sdd-kit/tests/test_estimation_review.py::TestEstimationReviewPermissionCheckerModule::test_engineer_cannot_send_to_hvt PASSED
sdd-kit/tests/test_estimation_review.py::TestEstimationReviewPermissionCheckerModule::test_cpo_cannot_send_to_hvt PASSED
sdd-kit/tests/test_estimation_review.py::TestEstimationReviewPermissionCheckerModule::test_all_roles_can_view PASSED
sdd-kit/tests/test_estimation_review.py::TestEstimationReviewPermissionCheckerModule::test_invalid_role PASSED
sdd-kit/tests/test_estimation_review.py::TestApprovalColumnDeriverModule::test_derives_estimated_row PASSED
sdd-kit/tests/test_estimation_review.py::TestApprovalColumnDeriverModule::test_derives_sent_row PASSED
sdd-kit/tests/test_estimation_review.py::TestApprovalColumnDeriverModule::test_derives_approved_row PASSED
sdd-kit/tests/test_estimation_review.py::TestApprovalColumnDeriverModule::test_derives_rejected_row PASSED
sdd-kit/tests/test_estimation_review.py::TestApprovalColumnDeriverModule::test_derives_preserves_original_fields PASSED
sdd-kit/tests/test_estimation_review.py::TestSendEligibilityCheckerModule::test_estimated_is_eligible_for_pmo PASSED
sdd-kit/tests/test_estimation_review.py::TestSendEligibilityCheckerModule::test_draft_not_eligible PASSED
sdd-kit/tests/test_estimation_review.py::TestSendEligibilityCheckerModule::test_to_do_not_eligible PASSED
sdd-kit/tests/test_estimation_review.py::TestSendEligibilityCheckerModule::test_engineer_not_eligible_even_if_estimated PASSED
sdd-kit/tests/test_estimation_review.py::TestSendEligibilityCheckerModule::test_find_eligible_rows PASSED
sdd-kit/tests/test_estimation_review.py::TestSendEligibilityCheckerModule::test_no_eligible_rows PASSED
sdd-kit/tests/test_estimation_review.py::TestHVTCallbackProcessorModule::test_approval PASSED
sdd-kit/tests/test_estimation_review.py::TestHVTCallbackProcessorModule::test_rejection PASSED
sdd-kit/tests/test_estimation_review.py::TestCSVExporterModule::test_export_empty PASSED
sdd-kit/tests/test_estimation_review.py::TestCSVExporterModule::test_export_simple_rows PASSED
sdd-kit/tests/test_estimation_review.py::TestCSVExporterModule::test_export_with_yearly_columns PASSED
sdd-kit/tests/test_estimation_review.py::TestCSVExporterModule::test_export_with_inductors PASSED
sdd-kit/tests/test_estimation_review.py::TestEstimationReviewPipeline::test_pipeline_imports PASSED
sdd-kit/tests/test_estimation_review.py::TestEstimationReviewPipeline::test_pipeline_can_be_instantiated PASSED
sdd-kit/tests/test_estimation_review.py::TestEstimationReviewPipeline::test_pipeline_rejects_cpo PASSED
sdd-kit/tests/test_estimation_review.py::TestEstimationReviewPipeline::test_pipeline_detects_eligible_rows PASSED
sdd-kit/tests/test_estimation_review.py::TestEstimationReviewPipeline::test_pipeline_adds_derived_columns PASSED
sdd-kit/tests/test_estimation_review.py::TestEstimationReviewPipeline::test_send_to_hvt PASSED
sdd-kit/tests/test_estimation_review.py::TestEstimationReviewPipeline::test_engineer_cannot_send_to_hvt PASSED
sdd-kit/tests/test_estimation_review.py::TestEstimationReviewPipeline::test_process_hvt_callback_approval PASSED
sdd-kit/tests/test_estimation_review.py::TestEstimationReviewPipeline::test_process_hvt_callback_rejection PASSED
sdd-kit/tests/test_estimation_review.py::TestEstimationReviewPipeline::test_export_csv_from_pipeline PASSED
```

### Final Review (13 tests)

```
sdd-kit/tests/test_final_review.py::test_permissions PASSED
sdd-kit/tests/test_final_review.py::test_all_roles_see_all PASSED
sdd-kit/tests/test_final_review.py::test_eligibility PASSED
sdd-kit/tests/test_final_review.py::test_aggregation_levels PASSED
sdd-kit/tests/test_final_review.py::test_stage3_config PASSED
sdd-kit/tests/test_final_review.py::test_10_rules PASSED
sdd-kit/tests/test_final_review.py::test_aggregate_at_level PASSED
sdd-kit/tests/test_final_review.py::test_calculate_subtotals PASSED
sdd-kit/tests/test_final_review.py::test_permission_checker PASSED
sdd-kit/tests/test_final_review.py::test_eligibility_filter PASSED
sdd-kit/tests/test_final_review.py::test_aggregation_engine PASSED
sdd-kit/tests/test_final_review.py::test_csv_exporter PASSED
sdd-kit/tests/test_final_review.py::test_csv_exporter_empty PASSED
sdd-kit/tests/test_final_review.py::test_stage3_sender_no_warning PASSED
sdd-kit/tests/test_final_review.py::test_stage3_sender_needs_confirmation PASSED
```

### Management View (13 tests)

```
sdd-kit/tests/test_management_view.py::test_access PASSED
sdd-kit/tests/test_management_view.py::test_excluded_metiers PASSED
sdd-kit/tests/test_management_view.py::test_8_rules PASSED
sdd-kit/tests/test_management_view.py::test_pie_chart PASSED
sdd-kit/tests/test_management_view.py::test_pie_chart_empty PASSED
sdd-kit/tests/test_management_view.py::test_pie_chart_single PASSED
sdd-kit/tests/test_management_view.py::test_access_checker PASSED
sdd-kit/tests/test_management_view.py::test_metier_filter PASSED
sdd-kit/tests/test_management_view.py::test_metier_filter_specific PASSED
sdd-kit/tests/test_management_view.py::test_count_by_status PASSED
sdd-kit/tests/test_management_view.py::test_pie_chart_builder PASSED
sdd-kit/tests/test_management_view.py::test_timeline_builder_empty PASSED
sdd-kit/tests/test_management_view.py::test_timeline_builder PASSED
```

### Pre-Estimation (68 tests)

```
sdd-kit/tests/test_pipeline.py::TestStateMachine::test_all_statuses_have_transitions PASSED
sdd-kit/tests/test_pipeline.py::TestStateMachine::test_todo_can_only_go_to_draft PASSED
sdd-kit/tests/test_pipeline.py::TestStateMachine::test_draft_can_go_to_draft_or_estimated PASSED
sdd-kit/tests/test_pipeline.py::TestStateMachine::test_estimated_can_go_to_sent_or_rejected PASSED
sdd-kit/tests/test_pipeline.py::TestStateMachine::test_sent_can_go_to_approved_or_rejected PASSED
sdd-kit/tests/test_pipeline.py::TestStateMachine::test_rejected_can_go_back_to_draft_or_estimated PASSED
sdd-kit/tests/test_pipeline.py::TestStateMachine::test_approved_is_terminal PASSED
sdd-kit/tests/test_pipeline.py::TestStateMachine::test_locked_statuses_includes_estimated_sent_approved PASSED
sdd-kit/tests/test_pipeline.py::TestStateMachine::test_editable_statuses_includes_todo_draft_rejected PASSED
sdd-kit/tests/test_pipeline.py::TestRolePermissions::test_engineer_can_edit_assigned_only PASSED
sdd-kit/tests/test_pipeline.py::TestRolePermissions::test_admin_can_edit_all PASSED
sdd-kit/tests/test_pipeline.py::TestRolePermissions::test_pmo_read_only PASSED
sdd-kit/tests/test_pipeline.py::TestRolePermissions::test_rcrc_read_only PASSED
sdd-kit/tests/test_pipeline.py::TestRolePermissions::test_cpo_no_access PASSED
sdd-kit/tests/test_pipeline.py::TestCompatibilityRules::test_compatible_lines_same_fields PASSED
sdd-kit/tests/test_pipeline.py::TestCompatibilityRules::test_incompatible_different_organ_type PASSED
sdd-kit/tests/test_pipeline.py::TestCompatibilityRules::test_null_vs_null_compatible PASSED
sdd-kit/tests/test_pipeline.py::TestCompatibilityRules::test_null_vs_value_incompatible PASSED
sdd-kit/tests/test_pipeline.py::TestCompatibilityRules::test_single_line_always_compatible PASSED
sdd-kit/tests/test_pipeline.py::TestCompatibilityRules::test_three_compatible_lines PASSED
sdd-kit/tests/test_pipeline.py::TestBusinessRules::test_all_17_rules_defined PASSED
sdd-kit/tests/test_pipeline.py::TestBusinessRules::test_each_rule_has_unique_id PASSED
sdd-kit/tests/test_pipeline.py::TestBusinessRules::test_no_deletion_rule_exists PASSED
sdd-kit/tests/test_pipeline.py::TestBusinessRules::test_draft_gate_rule_exists PASSED
sdd-kit/tests/test_pipeline.py::TestBusinessRules::test_sp_date_mandatory_rule PASSED
sdd-kit/tests/test_pipeline.py::TestWorkloadStandards::test_all_metiers_have_standards PASSED
sdd-kit/tests/test_pipeline.py::TestWorkloadStandards::test_backend_has_api_endpoints PASSED
sdd-kit/tests/test_pipeline.py::TestWorkloadStandards::test_each_inductor_has_at_least_one_cran PASSED
sdd-kit/tests/test_pipeline.py::TestWorkloadStandards::test_each_inductor_has_job_units PASSED
sdd-kit/tests/test_pipeline.py::TestWorkloadStandards::test_cran_coefficients_are_positive PASSED
sdd-kit/tests/test_pipeline.py::TestEstimationFormulas::test_ju_total_formula PASSED
sdd-kit/tests/test_pipeline.py::TestEstimationFormulas::test_zero_occurrence PASSED
sdd-kit/tests/test_pipeline.py::TestEstimationFormulas::test_fte_calculation PASSED
sdd-kit/tests/test_pipeline.py::TestEstimationFormulas::test_monthly_distribution PASSED
sdd-kit/tests/test_pipeline.py::TestSelectionValidatorModule::test_compatible_selection PASSED
sdd-kit/tests/test_pipeline.py::TestSelectionValidatorModule::test_incompatible_selection PASSED
sdd-kit/tests/test_pipeline.py::TestPermissionCheckerModule::test_engineer_can_edit_own_line PASSED
sdd-kit/tests/test_pipeline.py::TestPermissionCheckerModule::test_engineer_cannot_edit_others_line PASSED
sdd-kit/tests/test_pipeline.py::TestPermissionCheckerModule::test_admin_can_edit_any_line PASSED
sdd-kit/tests/test_pipeline.py::TestPermissionCheckerModule::test_pmo_cannot_edit PASSED
sdd-kit/tests/test_pipeline.py::TestPermissionCheckerModule::test_pmo_can_view PASSED
sdd-kit/tests/test_pipeline.py::TestPermissionCheckerModule::test_cpo_no_access PASSED
sdd-kit/tests/test_pipeline.py::TestPermissionCheckerModule::test_invalid_role PASSED
sdd-kit/tests/test_pipeline.py::TestStatusTransitionValidatorModule::test_todo_to_draft_valid PASSED
sdd-kit/tests/test_pipeline.py::TestStatusTransitionValidatorModule::test_todo_to_estimated_invalid_no_draft_gate PASSED
sdd-kit/tests/test_pipeline.py::TestStatusTransitionValidatorModule::test_draft_to_estimated_with_draft_gate PASSED
sdd-kit/tests/test_pipeline.py::TestStatusTransitionValidatorModule::test_draft_to_estimated_without_draft_gate PASSED
sdd-kit/tests/test_pipeline.py::TestStatusTransitionValidatorModule::test_estimated_to_sent PASSED
sdd-kit/tests/test_pipeline.py::TestStatusTransitionValidatorModule::test_approved_no_transitions PASSED
sdd-kit/tests/test_pipeline.py::TestStatusTransitionValidatorModule::test_invalid_status_values PASSED
sdd-kit/tests/test_pipeline.py::TestStatusTransitionValidatorModule::test_rejected_to_draft PASSED
sdd-kit/tests/test_pipeline.py::TestEstimationCalculatorModule::test_simple_calculation PASSED
sdd-kit/tests/test_pipeline.py::TestEstimationCalculatorModule::test_multiple_job_units PASSED
sdd-kit/tests/test_pipeline.py::TestEstimationCalculatorModule::test_bench_hours_unit_type PASSED
sdd-kit/tests/test_pipeline.py::TestEstimationCalculatorModule::test_empty_job_units PASSED
sdd-kit/tests/test_pipeline.py::TestSaveValidatorModule::test_valid_draft_save PASSED
sdd-kit/tests/test_pipeline.py::TestSaveValidatorModule::test_missing_sp_date_blocks_save PASSED
sdd-kit/tests/test_pipeline.py::TestSaveValidatorModule::test_no_inductors_with_cran_no_custom PASSED
sdd-kit/tests/test_pipeline.py::TestSaveValidatorModule::test_custom_jus_unblocked PASSED
sdd-kit/tests/test_pipeline.py::TestSaveValidatorModule::test_todo_to_draft_valid_transition PASSED
sdd-kit/tests/test_pipeline.py::TestSaveValidatorModule::test_todo_to_definitive_blocked_by_draft_gate PASSED
sdd-kit/tests/test_pipeline.py::TestFullPipeline::test_pipeline_imports PASSED
sdd-kit/tests/test_pipeline.py::TestFullPipeline::test_pipeline_can_be_instantiated PASSED
sdd-kit/tests/test_pipeline.py::TestSpecsConsistency::test_all_roles_in_permissions PASSED
sdd-kit/tests/test_pipeline.py::TestSpecsConsistency::test_valid_statuses_are_enum_members PASSED
sdd-kit/tests/test_pipeline.py::TestSpecsConsistency::test_compatibility_fields_are_valid PASSED
sdd-kit/tests/test_pipeline.py::TestSpecsConsistency::test_locked_and_editable_disjoint PASSED
sdd-kit/tests/test_pipeline.py::TestSpecsConsistency::test_man_day_divisor_is_reasonable PASSED
```

### Transversal (31 tests)

```
sdd-kit/tests/test_transversal.py::test_cycle_managers PASSED
sdd-kit/tests/test_transversal.py::test_workload_uploaders PASSED
sdd-kit/tests/test_transversal.py::test_cycle_rules PASSED
sdd-kit/tests/test_transversal.py::test_workload_rules PASSED
sdd-kit/tests/test_transversal.py::test_table_rules PASSED
sdd-kit/tests/test_transversal.py::test_email_rules PASSED
sdd-kit/tests/test_transversal.py::test_transversal_rules PASSED
sdd-kit/tests/test_transversal.py::test_transversal_rules_match PASSED
sdd-kit/tests/test_transversal.py::test_create_cycle PASSED
sdd-kit/tests/test_transversal.py::test_create_cycle_auto_deactivates PASSED
sdd-kit/tests/test_transversal.py::test_engineer_cannot_create_cycle PASSED
sdd-kit/tests/test_transversal.py::test_cpo_cannot_create_cycle PASSED
sdd-kit/tests/test_transversal.py::test_get_active_cycle PASSED
sdd-kit/tests/test_transversal.py::test_no_reactivation PASSED
sdd-kit/tests/test_transversal.py::test_cycle_not_found PASSED
sdd-kit/tests/test_transversal.py::test_upload_xlsx PASSED
sdd-kit/tests/test_transversal.py::test_upload_non_xlsx_rejected PASSED
sdd-kit/tests/test_transversal.py::test_upload_permission_denied PASSED
sdd-kit/tests/test_transversal.py::test_version_supersedes_previous PASSED
sdd-kit/tests/test_transversal.py::test_get_active_version PASSED
sdd-kit/tests/test_transversal.py::test_validate_file PASSED
sdd-kit/tests/test_transversal.py::test_table_state_initial PASSED
sdd-kit/tests/test_transversal.py::test_set_filter PASSED
sdd-kit/tests/test_transversal.py::test_set_sort PASSED
sdd-kit/tests/test_transversal.py::test_set_column_width PASSED
sdd-kit/tests/test_transversal.py::test_reset_page PASSED
sdd-kit/tests/test_transversal.py::test_reset_all PASSED
sdd-kit/tests/test_transversal.py::test_engineer_weekly PASSED
sdd-kit/tests/test_transversal.py::test_rcrc_weekly PASSED
sdd-kit/tests/test_transversal.py::test_rejection_notification PASSED
sdd-kit/tests/test_transversal.py::test_email_log PASSED
```

---

## Resumen

```
============================= 216 passed in 2.03s ==============================
```

| Suite | Tests | Estado |
|-------|-------|--------|
| Allocation | 27 | ✅ |
| Estimation Review | 62 | ✅ |
| Final Review | 17 | ✅ |
| Management View | 14 | ✅ |
| Pre-Estimation | 68 | ✅ |
| Transversal | 31 | ✅ |
| **Total** | **216** | **✅ 0 fallos** |