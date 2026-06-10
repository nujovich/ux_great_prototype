/**
 * GREAT API v2 — TypeScript types
 * Generated from great-api-openapi.yaml
 * Do not make direct changes to the file.
 */

export interface paths {
  "/project-lines": {
    get: operations["listProjectLines"];
  };
  "/project-lines/{id}": {
    get: operations["getProjectLine"];
  };
  "/project-lines/{id}/estimation": {
    get: operations["getEstimation"];
  };
  "/project-lines/{id}/workload-standard": {
    get: operations["getWorkloadStandard"];
  };
  "/project-lines/{id}/estimation/draft": {
    post: operations["saveEstimationDraft"];
  };
  "/project-lines/{id}/estimation/definitive": {
    post: operations["saveEstimationDefinitive"];
  };
  "/project-lines/estimation/batch-draft": {
    post: operations["batchSaveEstimationDraft"];
  };
  "/project-lines/estimation/batch-definitive": {
    post: operations["batchSaveEstimationDefinitive"];
  };
  "/project-lines/{id}/estimation/copy": {
    post: operations["copyEstimation"];
  };
  "/project-lines/{id}/prototype": {
    get: operations["getPrototype"];
    put: operations["savePrototype"];
  };
  "/prototype-categories": {
    get: operations["listPrototypeCategories"];
  };
  "/project-lines/{id}/estimation/send-to-hvt": {
    post: operations["sendToHvt"];
  };
  "/hvt/stage2-callback": {
    post: operations["hvtStage2Callback"];
  };
  "/project-lines/{id}/allocation": {
    put: operations["putAllocation"];
    patch: operations["patchAllocation"];
  };
  "/allocation/ju/{id}/split": {
    post: operations["splitAllocation"];
    delete: operations["undoSplitAllocation"];
  };
  "/allocation/bulk-assign": {
    patch: operations["bulkAssignAllocation"];
  };
  "/allocation/rules/{metier}": {
    put: operations["putAllocationRules"];
  };
  "/allocation/rates": {
    put: operations["putKEuroRates"];
  };
  "/metier-distribution": {
    put: operations["putMetierDistribution"];
  };
  "/final-review/send-stage3-hvt": {
    post: operations["sendStage3Hvt"];
  };
  "/management/dashboard/pie-chart": {
    get: operations["getPieChart"];
  };
  "/management/dashboard/timeline": {
    get: operations["getTimeline"];
  };
  "/cycles": {
    get: operations["listCycles"];
    post: operations["createCycle"];
  };
  "/cycles/active": {
    get: operations["getActiveCycle"];
  };
  "/workload-standard/upload": {
    post: operations["uploadWorkloadStandard"];
  };
  "/workload-standard/current": {
    get: operations["getCurrentWorkloadStandard"];
  };
  "/email-log": {
    get: operations["getEmailLog"];
  };
  "/emails/retry": {
    post: operations["retryEmail"];
  };
}

export interface components {
  schemas: {
    Metier: "H-DESIGN" | "H-TUNING" | "H-SOFTWARE" | "H-CUSTOMER" | "H-PROJECT" | "H-NP" | "H-TESTING";
    Status: "To do" | "Draft" | "Estimated" | "Sent" | "Rejected" | "Approved";
    CostType: "FTE" | "TSA" | "TC";
    ProjectLineListItem: {
      id: string;
      project_id: string;
      name: string;
      metier: components["schemas"]["Metier"];
      status: components["schemas"]["Status"];
      updated_at: string;
    };
    ProjectLineDetail: components["schemas"]["ProjectLineListItem"] & {
      description?: string;
      created_at?: string;
      cpo_comment?: string | null;
    };
    ProjectLineListResponse: {
      items: components["schemas"]["ProjectLineListItem"][];
      total: number;
    };
    JU: {
      id: string;
      name: string;
      occurrence: number;
      locked?: boolean;
      custom?: boolean;
    };
    Cran: {
      id: string;
      name: string;
      jus: components["schemas"]["JU"][];
    };
    Inductor: {
      id: string;
      name: string;
      crans: components["schemas"]["Cran"][];
    };
    EstimationPayload: {
      inductors: components["schemas"]["Inductor"][];
    };
    PreSaveSummary: {
      total_fte: number;
      total_bh: number;
      total_km: number;
      yearly: Record<string, { fte: number; bh: number; km: number }>;
    };
    SaveDraftResponse: {
      pre_save_summary: components["schemas"]["PreSaveSummary"];
    };
    CopyEstimationRequest: {
      source_line_id: string;
    };
    BatchSaveRequest: {
      line_ids: string[];
      inductors: components["schemas"]["Inductor"][];
    };
    BatchSaveLineResult: {
      line_id: string;
      summary: components["schemas"]["PreSaveSummary"];
    };
    BatchSaveResponse: {
      lines: components["schemas"]["BatchSaveLineResult"][];
    };
    WorkloadStandardResponse: {
      inductors: components["schemas"]["Inductor"][];
    };
    PrototypeCategoryEntry: {
      id: string;
      quantity: number;
    };
    PrototypePayload: {
      categories: components["schemas"]["PrototypeCategoryEntry"][];
      comment: string;
    };
    PrototypeCategory: {
      id: string;
      name: string;
    };
    HvtCallbackItem: {
      project_line_id: string;
      metier: components["schemas"]["Metier"];
      approved: boolean;
      comment?: string | null;
    };
    HvtCallbackRequest: components["schemas"]["HvtCallbackItem"][];
    HvtCallbackResultItem: {
      project_line_id: string;
      success: boolean;
      error: string | null;
    };
    HvtCallbackResponse: components["schemas"]["HvtCallbackResultItem"][];
    AllocationJU: {
      id: string;
      societe: string;
      cost_type?: components["schemas"]["CostType"];
    };
    AllocationPutRequest: {
      job_units: components["schemas"]["AllocationJU"][];
    };
    AllocationPatchRequest: {
      job_units: components["schemas"]["AllocationJU"][];
    };
    KEuroCalculated: {
      job_unit_id: string;
      year: string;
      ke: number;
    };
    AllocationSaveResponse: {
      saved: number;
      keuro_calculated: components["schemas"]["KEuroCalculated"][];
    };
    SplitEntry: {
      societe: string;
      percentage: number;
    };
    SplitRequest: {
      splits: components["schemas"]["SplitEntry"][];
    };
    SplitUndoResponse: {
      restored: boolean;
    };
    BulkAssignRequest: {
      job_unit_ids: string[];
      societe: string;
    };
    BulkAssignResponse: {
      saved: number;
      keuro_calculated: components["schemas"]["KEuroCalculated"][];
    };
    AllocationRuleEntry: {
      organ_type?: string | null;
      fuel_type?: string | null;
      ranking?: string | null;
      alliance_code?: string | null;
      vehicle_code?: string | null;
      standard_emissions?: string | null;
      market?: string | null;
      injection_system?: string | null;
      part_type?: string | null;
      society: string;
      is_exception?: boolean;
      diversity_flag?: boolean;
      priority?: number;
      row_order?: number;
    };
    AllocationRulesUploadRequest: {
      version: string;
      apply_on_upload?: boolean;
      rules: components["schemas"]["AllocationRuleEntry"][];
    };
    KEuroRateEntry: {
      society_site: string;
      cost_type: components["schemas"]["CostType"];
      year: number;
      rate: number;
    };
    KEuroRatesUploadRequest: {
      valid_from: string;
      rates: components["schemas"]["KEuroRateEntry"][];
    };
    MetierDistributionEntry: {
      metier: components["schemas"]["Metier"];
      sp_pc: number;
      pc_co: number;
      co_sop: number;
    };
    MetierDistributionUploadRequest: {
      valid_from: string;
      configs: components["schemas"]["MetierDistributionEntry"][];
    };
    Stage3SendRequest: {
      cycle_id: string;
    };
    Stage3SendResponse: {
      status: "Sent";
      lines_sent: number;
      warning?: string | null;
    };
    PieChartSlice: {
      status: components["schemas"]["Status"];
      count: number;
      percentage: number;
    };
    PieChartResponse: {
      total_pairs: number;
      slices: components["schemas"]["PieChartSlice"][];
    };
    TimelineDataPoint: {
      date: string;
      status_counts: Record<string, number>;
    };
    TimelineResponse: {
      data_points: components["schemas"]["TimelineDataPoint"][];
    };
    CycleResponse: {
      id: string;
      name: string;
      start_date: string;
      is_active: boolean;
      created_at: string;
    };
    CreateCycleRequest: {
      name: string;
      start_date: string;
    };
    CyclesListResponse: {
      items: components["schemas"]["CycleResponse"][];
    };
    WorkloadStandardCurrentResponse: {
      metier: components["schemas"]["Metier"];
      version_id: string;
      version_number: string;
      uploaded_at: string;
    };
    EmailLogItem: {
      id: string;
      recipient_oid: string;
      alert_type: "engineer_weekly" | "rcrc_weekly" | "rejection_notification";
      cycle_id: string | null;
      success: boolean;
      error_detail: string | null;
      sent_at: string;
    };
    EmailLogResponse: {
      items: components["schemas"]["EmailLogItem"][];
    };
    EmailRetryRequest: {
      email_log_id: string;
    };
    ErrorResponse: {
      code: string;
      message: string;
      details?: Record<string, unknown>;
    };
  };
  parameters: {
    PathId: string;
    PathMetier: components["schemas"]["Metier"];
  };
}

export interface operations {
  listProjectLines: {
    parameters: {
      query?: {
        status?: components["schemas"]["Status"];
        metier?: components["schemas"]["Metier"];
        project_id?: string;
        sort?: "name" | "-name" | "status" | "-status" | "updated_at" | "-updated_at";
        page?: number;
        page_size?: number;
      };
    };
    responses: {
      200: {
        content: {
          "application/json": components["schemas"]["ProjectLineListResponse"];
        };
      };
    };
  };
  getProjectLine: {
    responses: {
      200: {
        content: {
          "application/json": components["schemas"]["ProjectLineDetail"];
        };
      };
    };
  };
  getEstimation: {
    responses: {
      200: {
        content: {
          "application/json": components["schemas"]["EstimationPayload"];
        };
      };
    };
  };
  getWorkloadStandard: {
    responses: {
      200: {
        content: {
          "application/json": components["schemas"]["WorkloadStandardResponse"];
        };
      };
    };
  };
  saveEstimationDraft: {
    requestBody: {
      content: {
        "application/json": components["schemas"]["EstimationPayload"];
      };
    };
    responses: {
      200: {
        content: {
          "application/json": components["schemas"]["SaveDraftResponse"];
        };
      };
    };
  };
  saveEstimationDefinitive: {
    requestBody: {
      content: {
        "application/json": components["schemas"]["EstimationPayload"];
      };
    };
    responses: {
      200: {
        content: {
          "application/json": components["schemas"]["SaveDraftResponse"];
        };
      };
    };
  };
  batchSaveEstimationDraft: {
    requestBody: {
      content: {
        "application/json": components["schemas"]["BatchSaveRequest"];
      };
    };
    responses: {
      200: {
        content: {
          "application/json": components["schemas"]["BatchSaveResponse"];
        };
      };
    };
  };
  batchSaveEstimationDefinitive: {
    requestBody: {
      content: {
        "application/json": components["schemas"]["BatchSaveRequest"];
      };
    };
    responses: {
      200: {
        content: {
          "application/json": components["schemas"]["BatchSaveResponse"];
        };
      };
    };
  };
  copyEstimation: {
    requestBody: {
      content: {
        "application/json": components["schemas"]["CopyEstimationRequest"];
      };
    };
    responses: {
      200: {
        content: {
          "application/json": components["schemas"]["EstimationPayload"];
        };
      };
    };
  };
  getPrototype: {
    responses: {
      200: {
        content: {
          "application/json": components["schemas"]["PrototypePayload"];
        };
      };
    };
  };
  savePrototype: {
    requestBody: {
      content: {
        "application/json": components["schemas"]["PrototypePayload"];
      };
    };
    responses: {
      200: {
        content: {
          "application/json": components["schemas"]["PrototypePayload"];
        };
      };
    };
  };
  listPrototypeCategories: {
    responses: {
      200: {
        content: {
          "application/json": components["schemas"]["PrototypeCategory"][];
        };
      };
    };
  };
  sendToHvt: {
    responses: {
      200: {
        content: {
          "application/json": { status: "Sent" };
        };
      };
    };
  };
  hvtStage2Callback: {
    requestBody: {
      content: {
        "application/json": components["schemas"]["HvtCallbackRequest"];
      };
    };
    responses: {
      200: {
        content: {
          "application/json": components["schemas"]["HvtCallbackResponse"];
        };
      };
    };
  };
  putAllocation: {
    requestBody: {
      content: {
        "application/json": components["schemas"]["AllocationPutRequest"];
      };
    };
    responses: {
      200: {
        content: {
          "application/json": components["schemas"]["AllocationSaveResponse"];
        };
      };
    };
  };
  patchAllocation: {
    requestBody: {
      content: {
        "application/json": components["schemas"]["AllocationPatchRequest"];
      };
    };
    responses: {
      200: {
        content: {
          "application/json": components["schemas"]["AllocationSaveResponse"];
        };
      };
    };
  };
  splitAllocation: {
    requestBody: {
      content: {
        "application/json": components["schemas"]["SplitRequest"];
      };
    };
    responses: {
      200: {
        content: {
          "application/json": components["schemas"]["AllocationSaveResponse"];
        };
      };
    };
  };
  undoSplitAllocation: {
    responses: {
      200: {
        content: {
          "application/json": components["schemas"]["SplitUndoResponse"];
        };
      };
    };
  };
  bulkAssignAllocation: {
    requestBody: {
      content: {
        "application/json": components["schemas"]["BulkAssignRequest"];
      };
    };
    responses: {
      200: {
        content: {
          "application/json": components["schemas"]["BulkAssignResponse"];
        };
      };
    };
  };
  putAllocationRules: {
    requestBody: {
      content: {
        "application/json": components["schemas"]["AllocationRulesUploadRequest"];
      };
    };
    responses: {
      200: {
        content: {
          "application/json": { rules_saved: number };
        };
      };
    };
  };
  putKEuroRates: {
    requestBody: {
      content: {
        "application/json": components["schemas"]["KEuroRatesUploadRequest"];
      };
    };
    responses: {
      200: {
        content: {
          "application/json": { rates_saved: number };
        };
      };
    };
  };
  putMetierDistribution: {
    requestBody: {
      content: {
        "application/json": components["schemas"]["MetierDistributionUploadRequest"];
      };
    };
    responses: {
      200: {
        content: {
          "application/json": { configs_saved: number };
        };
      };
    };
  };
  sendStage3Hvt: {
    requestBody: {
      content: {
        "application/json": components["schemas"]["Stage3SendRequest"];
      };
    };
    responses: {
      200: {
        content: {
          "application/json": components["schemas"]["Stage3SendResponse"];
        };
      };
    };
  };
  getPieChart: {
    parameters: {
      query?: {
        metier?: string;
      };
    };
    responses: {
      200: {
        content: {
          "application/json": components["schemas"]["PieChartResponse"];
        };
      };
    };
  };
  getTimeline: {
    parameters: {
      query?: {
        metier?: string;
        from_date?: string;
        to_date?: string;
      };
    };
    responses: {
      200: {
        content: {
          "application/json": components["schemas"]["TimelineResponse"];
        };
      };
    };
  };
  listCycles: {
    responses: {
      200: {
        content: {
          "application/json": components["schemas"]["CyclesListResponse"];
        };
      };
    };
  };
  createCycle: {
    requestBody: {
      content: {
        "application/json": components["schemas"]["CreateCycleRequest"];
      };
    };
    responses: {
      201: {
        content: {
          "application/json": components["schemas"]["CycleResponse"];
        };
      };
    };
  };
  getActiveCycle: {
    responses: {
      200: {
        content: {
          "application/json": components["schemas"]["CycleResponse"];
        };
      };
    };
  };
  uploadWorkloadStandard: {
    requestBody: {
      content: {
        "multipart/form-data": {
          metier: components["schemas"]["Metier"];
          file: string;
        };
      };
    };
    responses: {
      201: {
        content: {
          "application/json": components["schemas"]["WorkloadStandardCurrentResponse"];
        };
      };
    };
  };
  getCurrentWorkloadStandard: {
    parameters: {
      query?: {
        metier?: components["schemas"]["Metier"];
      };
    };
    responses: {
      200: {
        content: {
          "application/json": components["schemas"]["WorkloadStandardCurrentResponse"];
        };
      };
    };
  };
  getEmailLog: {
    parameters: {
      query?: {
        alert_type?: "engineer_weekly" | "rcrc_weekly" | "rejection_notification";
        recipient?: string;
        success?: boolean;
      };
    };
    responses: {
      200: {
        content: {
          "application/json": components["schemas"]["EmailLogResponse"];
        };
      };
    };
  };
  retryEmail: {
    requestBody: {
      content: {
        "application/json": components["schemas"]["EmailRetryRequest"];
      };
    };
    responses: {
      200: {
        content: {
          "application/json": { success: boolean };
        };
      };
    };
  };
}
