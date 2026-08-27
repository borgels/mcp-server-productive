// GENERATED FILE — do not edit by hand.
//
// Produced by scripts/generate-registry.mjs from Productive's published OpenAPI
// document (https://developer.productive.io/reference/download_spec).
// Regenerate with `npm run registry:generate`.
//
// Spec fingerprint: 4bb049c87f6c279e

import type { GeneratedResource } from './registry-types.js';

export const SPEC_FINGERPRINT = '4bb049c87f6c279e';

/**
 * Operations that reach somebody outside the organization the moment they
 * run. Listed separately from the resources because some of them are plain
 * creates rather than named actions — `POST /invitations` sends an email as
 * surely as `PATCH /invoices/{id}/send` does, and the policy layer has to
 * recognise both by operation id.
 */
export const OUTWARD_OPERATIONS: readonly string[] = [
  'PATCH /invoices/{id}/send',
  'PATCH /invoices/{id}/send_einvoice',
  'PATCH /organizations/{id}/resend_code',
  'PATCH /people/{id}/invite',
  'PATCH /people/{id}/resend',
  'POST /invitations',
];

export const GENERATED_RESOURCES: Record<string, GeneratedResource> =
{
  "activities": {
    "key": "activities",
    "path": "/activities",
    "tag": "Activities",
    "tier": "write",
    "actions": [],
    "list": {
      "filters": [
        "after",
        "before",
        "booking_id",
        "company_id",
        "created_at",
        "creator_id",
        "deal_id",
        "discussion_id",
        "event",
        "expense_id",
        "has_attachments",
        "id",
        "invoice_id",
        "item_type",
        "normalized_item_type",
        "parent_type",
        "participant_id",
        "person_id",
        "pinned",
        "project_id",
        "proposal_id",
        "purchase_order_id",
        "resource_request_id",
        "root_type",
        "task_id",
        "type"
      ],
      "sorts": [],
      "relationships": [
        "attachment",
        "comment",
        "creator",
        "email",
        "organization",
        "role"
      ]
    },
    "get": {
      "relationships": [
        "attachment",
        "comment",
        "creator",
        "email",
        "organization",
        "role"
      ]
    }
  },
  "agent_configs": {
    "key": "agent_configs",
    "path": "/agent_configs",
    "tag": "Agent Configs",
    "tier": "admin",
    "actions": [],
    "list": {
      "filters": [
        "agent_id",
        "id"
      ],
      "sorts": [],
      "relationships": [
        "agent",
        "attachments"
      ]
    },
    "create": {
      "required": [
        "agent_id"
      ],
      "attributes": [
        "agent_id",
        "instructions"
      ],
      "relationships": []
    },
    "get": {
      "relationships": [
        "agent",
        "attachments"
      ]
    },
    "update": {
      "required": [],
      "attributes": [
        "instructions"
      ],
      "relationships": []
    },
    "remove": true
  },
  "agent_roles": {
    "key": "agent_roles",
    "path": "/agent_roles",
    "tag": "Agent Roles",
    "tier": "admin",
    "actions": [],
    "get": {
      "relationships": [
        "organization"
      ]
    },
    "update": {
      "required": [],
      "attributes": [
        "permissions"
      ],
      "relationships": []
    }
  },
  "agents": {
    "key": "agents",
    "path": "/agents",
    "tag": "Agents",
    "tier": "admin",
    "actions": [
      {
        "id": "PATCH /agents/{id}/activate",
        "name": "activate",
        "method": "PATCH",
        "path": "/agents/{id}/activate",
        "summary": "Activate an agent",
        "requiresId": true,
        "tier": "admin"
      },
      {
        "id": "PATCH /agents/{id}/deactivate",
        "name": "deactivate",
        "method": "PATCH",
        "path": "/agents/{id}/deactivate",
        "summary": "Deactivate an agent",
        "requiresId": true,
        "tier": "admin"
      }
    ],
    "list": {
      "filters": [
        "created_at",
        "custom_role_id",
        "deactivated_at",
        "id",
        "manager_id",
        "name",
        "query",
        "status",
        "title"
      ],
      "sorts": [],
      "relationships": [
        "agent_config",
        "custom_role",
        "manager",
        "person"
      ]
    },
    "create": {
      "required": [
        "manager_id",
        "name"
      ],
      "attributes": [
        "avatar_url",
        "custom_role_id",
        "manager_id",
        "name",
        "title"
      ],
      "relationships": []
    },
    "get": {
      "relationships": [
        "agent_config",
        "custom_role",
        "manager",
        "person"
      ]
    },
    "update": {
      "required": [
        "manager_id",
        "name"
      ],
      "attributes": [
        "avatar_url",
        "custom_role_id",
        "manager_id",
        "name",
        "title"
      ],
      "relationships": []
    }
  },
  "approval_policies": {
    "key": "approval_policies",
    "path": "/approval_policies",
    "tag": "Approval Policy",
    "tier": "admin",
    "actions": [
      {
        "id": "PATCH /approval_policies/{id}/archive",
        "name": "archive",
        "method": "PATCH",
        "path": "/approval_policies/{id}/archive",
        "summary": "Archives the approval policy",
        "requiresId": true,
        "tier": "admin"
      },
      {
        "id": "PATCH /approval_policies/{id}/restore",
        "name": "restore",
        "method": "PATCH",
        "path": "/approval_policies/{id}/restore",
        "summary": "Restores the approval policy",
        "requiresId": true,
        "tier": "admin"
      }
    ],
    "list": {
      "filters": [
        "custom",
        "status",
        "type_id"
      ],
      "sorts": [],
      "relationships": [
        "organization"
      ]
    },
    "create": {
      "required": [
        "type_id"
      ],
      "attributes": [
        "custom",
        "default",
        "name",
        "type_id"
      ],
      "relationships": []
    },
    "get": {
      "relationships": [
        "organization"
      ]
    },
    "update": {
      "required": [
        "type_id"
      ],
      "attributes": [
        "custom",
        "default",
        "name",
        "type_id"
      ],
      "relationships": []
    }
  },
  "approval_policy_assignments": {
    "key": "approval_policy_assignments",
    "path": "/approval_policy_assignments",
    "tag": "Approval Policy Assignment",
    "tier": "admin",
    "actions": [],
    "list": {
      "filters": [
        "target_id",
        "target_type"
      ],
      "sorts": [],
      "relationships": [
        "approval_policy",
        "deal",
        "organization",
        "person"
      ]
    },
    "create": {
      "required": [],
      "attributes": [
        "target_type"
      ],
      "relationships": []
    },
    "get": {
      "relationships": [
        "approval_policy",
        "deal",
        "organization",
        "person"
      ]
    },
    "update": {
      "required": [],
      "attributes": [
        "target_type"
      ],
      "relationships": []
    },
    "remove": true
  },
  "approval_statuses": {
    "key": "approval_statuses",
    "path": "/approval_statuses",
    "tag": "Approval Status",
    "tier": "write",
    "actions": [
      {
        "id": "PATCH /approval_statuses/{id}/approve",
        "name": "approve",
        "method": "PATCH",
        "path": "/approval_statuses/{id}/approve",
        "summary": "Approves an approval status",
        "requiresId": true,
        "tier": "write",
        "body": {
          "required": [],
          "attributes": [
            "note"
          ],
          "relationships": []
        }
      },
      {
        "id": "PATCH /approval_statuses/{id}/reject",
        "name": "reject",
        "method": "PATCH",
        "path": "/approval_statuses/{id}/reject",
        "summary": "Rejects an approval status",
        "requiresId": true,
        "tier": "write",
        "body": {
          "required": [],
          "attributes": [
            "note"
          ],
          "relationships": []
        }
      }
    ],
    "list": {
      "filters": [
        "actual_approver_id",
        "approval_workflow_id",
        "approver_id",
        "booking_id",
        "expense_id",
        "id",
        "time_entry_id"
      ],
      "sorts": [],
      "relationships": [
        "actual_approver",
        "approval_workflow",
        "approver",
        "booking",
        "expense",
        "time_entry"
      ]
    },
    "get": {
      "relationships": [
        "actual_approver",
        "approval_workflow",
        "approver",
        "booking",
        "expense",
        "time_entry"
      ]
    }
  },
  "approval_workflows": {
    "key": "approval_workflows",
    "path": "/approval_workflows",
    "tag": "Approval Workflow",
    "tier": "admin",
    "actions": [],
    "create": {
      "required": [],
      "attributes": [
        "approval_policy_id",
        "approval_requirement_id",
        "approver_ids",
        "dynamic_approver_ids",
        "dynamic_subscriber_ids",
        "event_id",
        "subscriber_ids",
        "target_type_id"
      ],
      "relationships": []
    },
    "get": {
      "relationships": [
        "approval_policy",
        "approvers",
        "event",
        "organization",
        "subscribers"
      ]
    },
    "update": {
      "required": [],
      "attributes": [
        "approval_policy_id",
        "approval_requirement_id",
        "approver_ids",
        "dynamic_approver_ids",
        "dynamic_subscriber_ids",
        "event_id",
        "subscriber_ids",
        "target_type_id"
      ],
      "relationships": []
    },
    "remove": true
  },
  "artifacts": {
    "key": "artifacts",
    "path": "/artifacts",
    "tag": "Artifacts",
    "tier": "write",
    "actions": [
      {
        "id": "PATCH /artifacts/{id}/publish",
        "name": "publish",
        "method": "PATCH",
        "path": "/artifacts/{id}/publish",
        "summary": "Publishes an artifact",
        "requiresId": true,
        "tier": "write"
      },
      {
        "id": "PATCH /artifacts/{id}/unpublish",
        "name": "unpublish",
        "method": "PATCH",
        "path": "/artifacts/{id}/unpublish",
        "summary": "Unpublishes an artifact",
        "requiresId": true,
        "tier": "write"
      }
    ],
    "get": {
      "relationships": [
        "attachment",
        "creator"
      ]
    },
    "remove": true,
    "list": {
      "filters": [
        "created_at",
        "creator_id",
        "id",
        "name",
        "public_access"
      ],
      "sorts": [
        "created_at",
        "name",
        "updated_at"
      ],
      "relationships": [
        "attachment",
        "creator"
      ]
    }
  },
  "attachments": {
    "key": "attachments",
    "path": "/attachments",
    "tag": "Attachments",
    "tier": "write",
    "actions": [],
    "list": {
      "filters": [
        "comment_id",
        "company_id",
        "creator_id",
        "full_query",
        "fuzzy_dates",
        "fuzzy_people",
        "id",
        "jump_query",
        "notes_attachment",
        "page_id",
        "project_id",
        "task_id",
        "type"
      ],
      "sorts": [
        "id"
      ],
      "relationships": [
        "bill",
        "comment",
        "creator",
        "deal",
        "document_style",
        "document_type",
        "email",
        "expense",
        "invoice",
        "organization",
        "page",
        "purchase_order",
        "task"
      ]
    },
    "create": {
      "required": [
        "name"
      ],
      "attributes": [
        "attachable_type",
        "attachment_type",
        "bill_id",
        "booking_id",
        "comment_id",
        "content_type",
        "document_style_id",
        "document_type_id",
        "expense_id",
        "file_updated_at",
        "invoice_id",
        "name",
        "page_id",
        "purchase_order_id",
        "size",
        "task_id",
        "temp_url",
        "widget_id"
      ],
      "relationships": []
    },
    "get": {
      "relationships": [
        "bill",
        "comment",
        "creator",
        "deal",
        "document_style",
        "document_type",
        "email",
        "expense",
        "invoice",
        "organization",
        "page",
        "purchase_order",
        "task"
      ]
    },
    "update": {
      "required": [
        "name"
      ],
      "attributes": [
        "attachable_type",
        "attachment_type",
        "bill_id",
        "booking_id",
        "comment_id",
        "content_type",
        "document_style_id",
        "document_type_id",
        "expense_id",
        "file_updated_at",
        "invoice_id",
        "name",
        "page_id",
        "purchase_order_id",
        "size",
        "task_id",
        "temp_url",
        "widget_id"
      ],
      "relationships": []
    },
    "remove": true
  },
  "automatic_invoicing_rules": {
    "key": "automatic_invoicing_rules",
    "path": "/automatic_invoicing_rules",
    "tag": "Automatic Invoicing Rules",
    "tier": "financial",
    "actions": [],
    "list": {
      "filters": [
        "budget_id",
        "creator_id",
        "id"
      ],
      "sorts": [
        "created_at",
        "id"
      ],
      "relationships": [
        "budget",
        "creator",
        "organization"
      ]
    },
    "create": {
      "required": [],
      "attributes": [
        "budget_id",
        "creation_offset",
        "creation_offset_unit",
        "reference_date",
        "skip_weekends"
      ],
      "relationships": []
    },
    "get": {
      "relationships": [
        "budget",
        "creator",
        "organization"
      ]
    },
    "update": {
      "required": [],
      "attributes": [
        "budget_id",
        "creation_offset",
        "creation_offset_unit",
        "reference_date",
        "skip_weekends"
      ],
      "relationships": []
    },
    "remove": true
  },
  "bank_accounts": {
    "key": "bank_accounts",
    "path": "/bank_accounts",
    "tag": "BankAccounts",
    "tier": "financial",
    "actions": [
      {
        "id": "PATCH /bank_accounts/{id}/archive",
        "name": "archive",
        "method": "PATCH",
        "path": "/bank_accounts/{id}/archive",
        "summary": "Archives a bank account",
        "requiresId": true,
        "tier": "financial"
      },
      {
        "id": "PATCH /bank_accounts/{id}/restore",
        "name": "restore",
        "method": "PATCH",
        "path": "/bank_accounts/{id}/restore",
        "summary": "Restores an archived bank account",
        "requiresId": true,
        "tier": "financial"
      }
    ],
    "list": {
      "filters": [
        "bank_name",
        "id",
        "name",
        "status",
        "subsidiary_id"
      ],
      "sorts": [
        "id",
        "name"
      ],
      "relationships": [
        "organization",
        "subsidiary"
      ]
    },
    "create": {
      "required": [],
      "attributes": [
        "bank_address",
        "bank_name",
        "currency",
        "name",
        "number",
        "subsidiary_id",
        "swift_code"
      ],
      "relationships": []
    },
    "get": {
      "relationships": [
        "organization",
        "subsidiary"
      ]
    },
    "update": {
      "required": [],
      "attributes": [
        "bank_address",
        "bank_name",
        "currency",
        "name",
        "number",
        "subsidiary_id",
        "swift_code"
      ],
      "relationships": []
    }
  },
  "bills": {
    "key": "bills",
    "path": "/bills",
    "tag": "Bills",
    "tier": "financial",
    "actions": [],
    "create": {
      "required": [
        "purchase_order_id"
      ],
      "attributes": [
        "attachment_id",
        "date",
        "due_date",
        "invoice_number",
        "purchase_order_id"
      ],
      "relationships": []
    },
    "get": {
      "relationships": [
        "attachment",
        "creator",
        "deal",
        "organization",
        "purchase_order"
      ]
    },
    "update": {
      "required": [
        "purchase_order_id"
      ],
      "attributes": [
        "attachment_id",
        "date",
        "due_date",
        "invoice_number",
        "purchase_order_id"
      ],
      "relationships": []
    },
    "remove": true
  },
  "boards": {
    "key": "boards",
    "path": "/boards",
    "tag": "Boards",
    "tier": "write",
    "actions": [
      {
        "id": "PATCH /boards/{id}/archive",
        "name": "archive",
        "method": "PATCH",
        "path": "/boards/{id}/archive",
        "summary": "Archives a board",
        "requiresId": true,
        "tier": "write"
      },
      {
        "id": "POST /boards/copy",
        "name": "copy",
        "method": "POST",
        "path": "/boards/copy",
        "summary": "Copy a board",
        "requiresId": false,
        "tier": "write"
      },
      {
        "id": "PATCH /boards/{id}/move",
        "name": "move",
        "method": "PATCH",
        "path": "/boards/{id}/move",
        "summary": "Move a board",
        "requiresId": true,
        "tier": "write"
      },
      {
        "id": "PATCH /boards/{id}/reposition",
        "name": "reposition",
        "method": "PATCH",
        "path": "/boards/{id}/reposition",
        "summary": "Repoisition a board",
        "requiresId": true,
        "tier": "write"
      },
      {
        "id": "PATCH /boards/{id}/restore",
        "name": "restore",
        "method": "PATCH",
        "path": "/boards/{id}/restore",
        "summary": "Restores a board",
        "requiresId": true,
        "tier": "write"
      }
    ],
    "list": {
      "filters": [
        "id",
        "project_id",
        "query",
        "status"
      ],
      "sorts": [],
      "relationships": [
        "organization",
        "project"
      ]
    },
    "create": {
      "required": [
        "name"
      ],
      "attributes": [
        "hidden",
        "name",
        "position",
        "project_id"
      ],
      "relationships": []
    },
    "get": {
      "relationships": [
        "organization",
        "project"
      ]
    },
    "update": {
      "required": [
        "name"
      ],
      "attributes": [
        "hidden",
        "name",
        "position",
        "project_id"
      ],
      "relationships": []
    }
  },
  "bookings": {
    "key": "bookings",
    "path": "/bookings",
    "tag": "Bookings",
    "tier": "write",
    "actions": [],
    "list": {
      "filters": [
        "after",
        "approval_status",
        "approved_at",
        "approver_id",
        "autotracking",
        "before",
        "billing_type_id",
        "booking_type",
        "budget_id",
        "canceled",
        "canceled_at",
        "company_id",
        "created_at",
        "custom_fields",
        "draft",
        "ended_on",
        "event_id",
        "id",
        "last_activity_at",
        "note",
        "origin_id",
        "people_custom_fields",
        "person_id",
        "person_subsidiary_id",
        "person_type",
        "project_id",
        "project_type",
        "rejected_at",
        "resource_request_id",
        "stage_type",
        "started_on",
        "status",
        "tags",
        "task_id",
        "updated_at",
        "with_draft"
      ],
      "sorts": [
        "draft",
        "last_activity_at",
        "started_on"
      ],
      "relationships": [
        "approval_statuses",
        "approver",
        "attachments",
        "canceler",
        "creator",
        "custom_field_attachments",
        "custom_field_people",
        "event",
        "organization",
        "origin",
        "person",
        "rejecter",
        "resource_request",
        "scenario_item",
        "service",
        "task",
        "updater"
      ]
    },
    "create": {
      "required": [
        "ended_on",
        "person_id",
        "started_on"
      ],
      "attributes": [
        "approver_id",
        "attachment_ids",
        "autotracking",
        "booking_method_id",
        "custom_fields",
        "draft",
        "ended_on",
        "event_id",
        "note",
        "origin_id",
        "percentage",
        "person_id",
        "rejected_reason",
        "resource_request_id",
        "service_id",
        "started_on",
        "task_id",
        "time",
        "total_time",
        "use_salary_currency"
      ],
      "relationships": []
    },
    "get": {
      "relationships": [
        "approval_statuses",
        "approver",
        "attachments",
        "canceler",
        "creator",
        "custom_field_attachments",
        "custom_field_people",
        "event",
        "organization",
        "origin",
        "person",
        "rejecter",
        "resource_request",
        "scenario_item",
        "service",
        "task",
        "updater"
      ]
    },
    "update": {
      "required": [
        "ended_on",
        "person_id",
        "started_on"
      ],
      "attributes": [
        "approver_id",
        "attachment_ids",
        "autotracking",
        "booking_method_id",
        "custom_fields",
        "draft",
        "ended_on",
        "event_id",
        "note",
        "origin_id",
        "percentage",
        "person_id",
        "rejected_reason",
        "resource_request_id",
        "service_id",
        "started_on",
        "task_id",
        "time",
        "total_time",
        "use_salary_currency"
      ],
      "relationships": []
    },
    "remove": true
  },
  "comments": {
    "key": "comments",
    "path": "/comments",
    "tag": "Comments",
    "tier": "write",
    "actions": [
      {
        "id": "PATCH /comments/{id}/add_reaction",
        "name": "add_reaction",
        "method": "PATCH",
        "path": "/comments/{id}/add_reaction",
        "summary": "Adds reaction to a comment",
        "requiresId": true,
        "tier": "write"
      },
      {
        "id": "PATCH /comments/{id}/pin",
        "name": "pin",
        "method": "PATCH",
        "path": "/comments/{id}/pin",
        "summary": "Pins a comment",
        "requiresId": true,
        "tier": "write"
      },
      {
        "id": "PATCH /comments/{id}/remove_reaction",
        "name": "remove_reaction",
        "method": "PATCH",
        "path": "/comments/{id}/remove_reaction",
        "summary": "Removes reaction from comment",
        "requiresId": true,
        "tier": "write"
      },
      {
        "id": "PATCH /comments/{id}/unpin",
        "name": "unpin",
        "method": "PATCH",
        "path": "/comments/{id}/unpin",
        "summary": "Unpins a comment",
        "requiresId": true,
        "tier": "write"
      }
    ],
    "list": {
      "filters": [
        "budget_status",
        "commentable_project_id",
        "company_id",
        "discussion_id",
        "draft",
        "full_query",
        "fuzzy_dates",
        "fuzzy_people",
        "jump_query",
        "page_id",
        "person_type",
        "project_id",
        "public_access",
        "responsible_id",
        "role_id",
        "sales_status_id",
        "status",
        "status_id",
        "task_id",
        "workflow_status_category_id"
      ],
      "sorts": [
        "created_at"
      ],
      "relationships": [
        "attachments",
        "company",
        "creator",
        "deal",
        "discussion",
        "invoice",
        "organization",
        "person",
        "pinned_by",
        "project",
        "purchase_order",
        "task"
      ]
    },
    "create": {
      "required": [],
      "attributes": [
        "attachment_ids",
        "body",
        "company_id",
        "deal_id",
        "discussion_id",
        "draft",
        "hidden",
        "invoice_id",
        "person_id",
        "project_id",
        "proposal_id",
        "purchase_order_id",
        "resource_request_id",
        "task_id",
        "version_number"
      ],
      "relationships": []
    },
    "get": {
      "relationships": [
        "attachments",
        "company",
        "creator",
        "deal",
        "discussion",
        "invoice",
        "organization",
        "person",
        "pinned_by",
        "project",
        "purchase_order",
        "task"
      ]
    },
    "update": {
      "required": [],
      "attributes": [
        "attachment_ids",
        "body",
        "company_id",
        "deal_id",
        "discussion_id",
        "draft",
        "hidden",
        "invoice_id",
        "person_id",
        "project_id",
        "proposal_id",
        "purchase_order_id",
        "resource_request_id",
        "task_id",
        "version_number"
      ],
      "relationships": []
    },
    "remove": true
  },
  "companies": {
    "key": "companies",
    "path": "/companies",
    "tag": "Companies",
    "tier": "write",
    "actions": [
      {
        "id": "PATCH /companies/{id}/archive",
        "name": "archive",
        "method": "PATCH",
        "path": "/companies/{id}/archive",
        "summary": "Archives a company",
        "requiresId": true,
        "tier": "write"
      },
      {
        "id": "PATCH /companies/{id}/restore",
        "name": "restore",
        "method": "PATCH",
        "path": "/companies/{id}/restore",
        "summary": "Restores a company",
        "requiresId": true,
        "tier": "write"
      }
    ],
    "list": {
      "filters": [
        "archived_at",
        "billing_name",
        "company_code",
        "company_id",
        "created_at",
        "custom_fields",
        "default_currency",
        "default_subsidiary_id",
        "default_tax_rate_id",
        "due_days",
        "exclude_company_and_children",
        "full_query",
        "fuzzy_dates",
        "fuzzy_people",
        "has_parent_company",
        "id",
        "jump_query",
        "last_activity_at",
        "name",
        "parent_company_id",
        "payment_terms",
        "payment_terms_type",
        "project_id",
        "query",
        "status",
        "subscriber_id",
        "subsidiary_id",
        "tags",
        "vat"
      ],
      "sorts": [
        "company_code",
        "created_at",
        "custom_fields",
        "last_activity_at",
        "name",
        "parent_company"
      ],
      "relationships": [
        "custom_field_attachments",
        "custom_field_people",
        "default_document_type",
        "default_subsidiary",
        "default_tax_rate",
        "einvoice_identity",
        "import",
        "integration_exporter_configuration",
        "organization",
        "parent_company"
      ]
    },
    "create": {
      "required": [
        "name"
      ],
      "attributes": [
        "avatar_url",
        "billing_name",
        "company_code",
        "contact",
        "custom_fields",
        "default_currency",
        "default_document_type_id",
        "default_subsidiary_id",
        "default_tax_rate_id",
        "domain",
        "due_days",
        "name",
        "parent_company_id",
        "payment_terms_type",
        "settings",
        "subscriber_ids",
        "tag_list",
        "vat"
      ],
      "relationships": []
    },
    "get": {
      "relationships": [
        "custom_field_attachments",
        "custom_field_people",
        "default_document_type",
        "default_subsidiary",
        "default_tax_rate",
        "einvoice_identity",
        "import",
        "integration_exporter_configuration",
        "organization",
        "parent_company"
      ]
    },
    "update": {
      "required": [
        "name"
      ],
      "attributes": [
        "avatar_url",
        "billing_name",
        "company_code",
        "contact",
        "custom_fields",
        "default_currency",
        "default_document_type_id",
        "default_subsidiary_id",
        "default_tax_rate_id",
        "domain",
        "due_days",
        "name",
        "parent_company_id",
        "payment_terms_type",
        "settings",
        "subscriber_ids",
        "tag_list",
        "vat"
      ],
      "relationships": []
    }
  },
  "contact_entries": {
    "key": "contact_entries",
    "path": "/contact_entries",
    "tag": "Contact Entries",
    "tier": "write",
    "actions": [],
    "list": {
      "filters": [
        "company_id",
        "contactable_id",
        "contactable_type",
        "invoice_id",
        "person_id",
        "subsidiary_id"
      ],
      "sorts": [],
      "relationships": [
        "company",
        "invoice",
        "invoice_template",
        "organization",
        "person",
        "purchase_order",
        "subsidiary"
      ]
    },
    "create": {
      "required": [
        "name",
        "type"
      ],
      "attributes": [
        "address",
        "billing_address",
        "billing_email",
        "city",
        "company_id",
        "contactable_type",
        "country",
        "email",
        "invoice_id",
        "invoice_template_id",
        "name",
        "organization_id",
        "person_id",
        "phone",
        "purchase_order_id",
        "state",
        "subsidiary_id",
        "type",
        "vat",
        "website",
        "zipcode"
      ],
      "relationships": []
    },
    "get": {
      "relationships": [
        "company",
        "invoice",
        "invoice_template",
        "organization",
        "person",
        "purchase_order",
        "subsidiary"
      ]
    },
    "update": {
      "required": [
        "name",
        "type"
      ],
      "attributes": [
        "address",
        "billing_address",
        "billing_email",
        "city",
        "company_id",
        "contactable_type",
        "country",
        "email",
        "invoice_id",
        "invoice_template_id",
        "name",
        "organization_id",
        "person_id",
        "phone",
        "purchase_order_id",
        "state",
        "subsidiary_id",
        "type",
        "vat",
        "website",
        "zipcode"
      ],
      "relationships": []
    },
    "remove": true
  },
  "contracts": {
    "key": "contracts",
    "path": "/contracts",
    "tag": "Contracts",
    "tier": "financial",
    "actions": [
      {
        "id": "POST /contracts/{id}/generate",
        "name": "generate",
        "method": "POST",
        "path": "/contracts/{id}/generate",
        "summary": "Generates new budget",
        "requiresId": true,
        "tier": "financial"
      }
    ],
    "list": {
      "filters": [
        "contract_interval_id",
        "ends_on",
        "id",
        "next_occurrence_on",
        "starts_on"
      ],
      "sorts": [],
      "relationships": [
        "organization",
        "template"
      ]
    },
    "create": {
      "required": [
        "interval_id",
        "template_id"
      ],
      "attributes": [
        "copy_expenses",
        "copy_purchase_order_number",
        "ends_on",
        "interval_id",
        "next_occurrence_on",
        "template_id",
        "use_rollover_hours"
      ],
      "relationships": []
    },
    "get": {
      "relationships": [
        "organization",
        "template"
      ]
    },
    "update": {
      "required": [
        "interval_id",
        "template_id"
      ],
      "attributes": [
        "copy_expenses",
        "copy_purchase_order_number",
        "ends_on",
        "interval_id",
        "next_occurrence_on",
        "template_id",
        "use_rollover_hours"
      ],
      "relationships": []
    },
    "remove": true
  },
  "custom_domains": {
    "key": "custom_domains",
    "path": "/custom_domains",
    "tag": "Custom domains",
    "tier": "admin",
    "actions": [],
    "list": {
      "filters": [
        "id",
        "name"
      ],
      "sorts": [],
      "relationships": [
        "organization",
        "subsidiaries"
      ]
    },
    "create": {
      "required": [],
      "attributes": [
        "allow_user_email",
        "email_sender_address",
        "email_sender_name",
        "name"
      ],
      "relationships": []
    },
    "get": {
      "relationships": [
        "organization",
        "subsidiaries"
      ]
    },
    "remove": true
  },
  "custom_field_options": {
    "key": "custom_field_options",
    "path": "/custom_field_options",
    "tag": "Custom Field Options",
    "tier": "admin",
    "actions": [
      {
        "id": "PATCH /custom_field_options/{id}/archive",
        "name": "archive",
        "method": "PATCH",
        "path": "/custom_field_options/{id}/archive",
        "summary": "Archives a custom field option",
        "requiresId": true,
        "tier": "admin"
      }
    ],
    "list": {
      "filters": [
        "archived",
        "custom_field_id"
      ],
      "sorts": [],
      "relationships": [
        "custom_field",
        "organization"
      ]
    },
    "create": {
      "required": [
        "custom_field_id",
        "name"
      ],
      "attributes": [
        "color_id",
        "custom_field_id",
        "name",
        "position"
      ],
      "relationships": []
    },
    "get": {
      "relationships": [
        "custom_field",
        "organization"
      ]
    },
    "update": {
      "required": [
        "custom_field_id",
        "name"
      ],
      "attributes": [
        "color_id",
        "custom_field_id",
        "name",
        "position"
      ],
      "relationships": []
    }
  },
  "custom_field_sections": {
    "key": "custom_field_sections",
    "path": "/custom_field_sections",
    "tag": "Custom Field Section",
    "tier": "admin",
    "actions": [
      {
        "id": "PATCH /custom_field_sections/{id}/archive",
        "name": "archive",
        "method": "PATCH",
        "path": "/custom_field_sections/{id}/archive",
        "summary": "Archives the custom field section",
        "requiresId": true,
        "tier": "admin"
      }
    ],
    "list": {
      "filters": [
        "status"
      ],
      "sorts": [],
      "relationships": [
        "organization"
      ]
    },
    "create": {
      "required": [
        "name"
      ],
      "attributes": [
        "customizable_type",
        "name",
        "position"
      ],
      "relationships": []
    },
    "get": {
      "relationships": [
        "organization"
      ]
    },
    "update": {
      "required": [
        "name"
      ],
      "attributes": [
        "customizable_type",
        "name",
        "position"
      ],
      "relationships": []
    }
  },
  "custom_fields": {
    "key": "custom_fields",
    "path": "/custom_fields",
    "tag": "Custom Fields",
    "tier": "admin",
    "actions": [
      {
        "id": "PATCH /custom_fields/{id}/archive",
        "name": "archive",
        "method": "PATCH",
        "path": "/custom_fields/{id}/archive",
        "summary": "Archives a custom field",
        "requiresId": true,
        "tier": "admin"
      }
    ],
    "list": {
      "filters": [
        "archived",
        "customizable_type",
        "global",
        "name",
        "project_id",
        "show_in_add_edit_views",
        "survey_id"
      ],
      "sorts": [],
      "relationships": [
        "custom_field_people",
        "options",
        "organization",
        "project",
        "section",
        "survey"
      ]
    },
    "create": {
      "required": [
        "customizable_type",
        "data_type_id",
        "name"
      ],
      "attributes": [
        "aggregation_type_id",
        "customizable_type",
        "data_type_id",
        "formatting_type_id",
        "global",
        "maximum_value",
        "minimum_value",
        "name",
        "position",
        "project_id",
        "quick_add_enabled",
        "required",
        "section_id",
        "sensitive",
        "show_in_add_edit_views",
        "survey_id"
      ],
      "relationships": []
    },
    "get": {
      "relationships": [
        "custom_field_people",
        "options",
        "organization",
        "project",
        "section",
        "survey"
      ]
    },
    "update": {
      "required": [
        "customizable_type",
        "data_type_id",
        "name"
      ],
      "attributes": [
        "aggregation_type_id",
        "customizable_type",
        "data_type_id",
        "formatting_type_id",
        "global",
        "maximum_value",
        "minimum_value",
        "name",
        "position",
        "project_id",
        "quick_add_enabled",
        "required",
        "section_id",
        "sensitive",
        "show_in_add_edit_views",
        "survey_id"
      ],
      "relationships": []
    }
  },
  "dashboards": {
    "key": "dashboards",
    "path": "/dashboards",
    "tag": "Dashboards",
    "tier": "write",
    "actions": [
      {
        "id": "POST /dashboards/copy",
        "name": "copy",
        "method": "POST",
        "path": "/dashboards/copy",
        "summary": "Copy a dashboard",
        "requiresId": false,
        "tier": "write"
      }
    ],
    "list": {
      "filters": [
        "editable",
        "project_id",
        "query"
      ],
      "sorts": [],
      "relationships": [
        "creator",
        "organization",
        "project"
      ]
    },
    "create": {
      "required": [
        "name"
      ],
      "attributes": [
        "is_private",
        "name",
        "project_id"
      ],
      "relationships": []
    },
    "get": {
      "relationships": [
        "creator",
        "organization",
        "project"
      ]
    },
    "update": {
      "required": [
        "name"
      ],
      "attributes": [
        "is_private",
        "name",
        "project_id"
      ],
      "relationships": []
    },
    "remove": true
  },
  "deal_cost_rates": {
    "key": "deal_cost_rates",
    "path": "/deal_cost_rates",
    "tag": "Deal Cost Rates",
    "tier": "financial",
    "actions": [],
    "list": {
      "filters": [
        "deal_id",
        "person_id"
      ],
      "sorts": [
        "rate_cents"
      ],
      "relationships": [
        "deal",
        "organization",
        "person"
      ]
    },
    "create": {
      "required": [],
      "attributes": [
        "currency",
        "deal_id",
        "person_id",
        "rate_cents"
      ],
      "relationships": []
    },
    "get": {
      "relationships": [
        "deal",
        "organization",
        "person"
      ]
    },
    "update": {
      "required": [],
      "attributes": [
        "currency",
        "deal_id",
        "person_id",
        "rate_cents"
      ],
      "relationships": []
    },
    "remove": true
  },
  "deal_statuses": {
    "key": "deal_statuses",
    "path": "/deal_statuses",
    "tag": "Deal Statuses",
    "tier": "write",
    "actions": [
      {
        "id": "PATCH /deal_statuses/{id}/archive",
        "name": "archive",
        "method": "PATCH",
        "path": "/deal_statuses/{id}/archive",
        "summary": "Archives a deal status",
        "requiresId": true,
        "tier": "write"
      },
      {
        "id": "PATCH /deal_statuses/merge",
        "name": "bulk_merge",
        "method": "PATCH",
        "path": "/deal_statuses/merge",
        "summary": "Merges a deal status",
        "requiresId": false,
        "collectionWide": true,
        "tier": "write"
      }
    ],
    "list": {
      "filters": [
        "booking_tracking_enabled",
        "expense_tracking_enabled",
        "id",
        "lost_reason_enabled",
        "pipeline_id",
        "pipeline_type_id",
        "probability_enabled",
        "query",
        "status_id",
        "time_tracking_enabled"
      ],
      "sorts": [
        "created_at",
        "id",
        "name",
        "pipeline_id",
        "position",
        "status_id"
      ],
      "relationships": [
        "organization",
        "pipeline"
      ]
    },
    "create": {
      "required": [
        "name",
        "pipeline_id"
      ],
      "attributes": [
        "booking_tracking_enabled",
        "color_id",
        "expense_tracking_enabled",
        "lost_reason_enabled",
        "name",
        "pipeline_id",
        "position",
        "probability",
        "probability_enabled",
        "status_id",
        "time_tracking_enabled"
      ],
      "relationships": []
    },
    "get": {
      "relationships": [
        "organization",
        "pipeline"
      ]
    },
    "update": {
      "required": [
        "name",
        "pipeline_id"
      ],
      "attributes": [
        "booking_tracking_enabled",
        "color_id",
        "expense_tracking_enabled",
        "lost_reason_enabled",
        "name",
        "pipeline_id",
        "position",
        "probability",
        "probability_enabled",
        "status_id",
        "time_tracking_enabled"
      ],
      "relationships": []
    },
    "remove": true
  },
  "deals": {
    "key": "deals",
    "path": "/deals",
    "tag": "Deals",
    "tier": "write",
    "actions": [
      {
        "id": "PATCH /deals/{id}/close",
        "name": "close",
        "method": "PATCH",
        "path": "/deals/{id}/close",
        "summary": "Closes a deal",
        "requiresId": true,
        "tier": "write"
      },
      {
        "id": "POST /deals/copy",
        "name": "copy",
        "method": "POST",
        "path": "/deals/copy",
        "summary": "Copies a deal",
        "requiresId": false,
        "tier": "write"
      },
      {
        "id": "POST /deals/create_from_origin",
        "name": "create_from_origin",
        "method": "POST",
        "path": "/deals/create_from_origin",
        "summary": "Creates a budget from origin deal",
        "requiresId": false,
        "tier": "write"
      },
      {
        "id": "PATCH /deals/{id}/open",
        "name": "open",
        "method": "PATCH",
        "path": "/deals/{id}/open",
        "summary": "Opens a deal",
        "requiresId": true,
        "tier": "write"
      }
    ],
    "list": {
      "filters": [
        "accessible_by_person",
        "actual_rate",
        "approval_policy_id",
        "billable_time",
        "budget_remaining",
        "budget_status",
        "budget_total",
        "budget_usage",
        "budget_used",
        "budget_warning",
        "budgeted_time",
        "closed_at",
        "color_id",
        "company_id",
        "contact_id",
        "contract_id",
        "cost",
        "created_at",
        "creator_id",
        "credited",
        "currency",
        "custom_fields",
        "date",
        "days_in_current_stage",
        "days_since_created",
        "days_since_last_activity",
        "deal_status_id",
        "deal_type_id",
        "delivered_on",
        "designated_approver_id",
        "discount",
        "draft_invoiced",
        "end_date",
        "estimated_cost",
        "estimated_remaining_time",
        "estimated_time",
        "expense",
        "expenses_billable",
        "forecasted_billable_time",
        "forecasted_budget_usage",
        "forecasted_budget_used",
        "forecasted_cost",
        "forecasted_margin",
        "forecasted_profit",
        "forecasted_revenue",
        "forecasted_time_usage",
        "full_query",
        "future_booked_time",
        "future_budget_used",
        "future_cost",
        "future_revenue",
        "fuzzy_dates",
        "fuzzy_people",
        "id",
        "invoiced",
        "invoiced_percentage",
        "invoiced_rate",
        "jump_query",
        "last_activity_at",
        "lost_at",
        "lost_date",
        "lost_reason_id",
        "manual_invoicing_status",
        "manually_invoiced",
        "name",
        "needs_closing",
        "needs_invoicing",
        "next_occurrence_on",
        "number",
        "origin_deal_id",
        "parent_company_id",
        "pending_invoicing",
        "pipeline_id",
        "previous_deal_status_id",
        "previous_or_current_deal_status_id",
        "previous_probability",
        "probability",
        "profit",
        "profit_margin",
        "project_id",
        "project_type",
        "projected_revenue",
        "purchase_order_number",
        "query",
        "recurring",
        "recurring_ends_on",
        "recurring_interval_id",
        "recurring_starts_on",
        "responsible_id",
        "retainer_interval",
        "revenue",
        "revenue_distribution_type",
        "sales_closed_at",
        "sales_closed_on",
        "sales_status_id",
        "services_revenue",
        "stage_status_id",
        "stage_updated_at",
        "status",
        "status_id",
        "subscriber_id",
        "subsidiary_id",
        "tags",
        "template",
        "time_approval",
        "time_entry_requirements",
        "todo_due_date",
        "tracking_type_id",
        "type",
        "unapproved_time",
        "won_at",
        "won_date",
        "work_cost",
        "worked_time"
      ],
      "sorts": [
        "billable_time",
        "budget_status",
        "budget_total",
        "budget_used",
        "budget_warning",
        "budgeted_time",
        "budgets_first",
        "client_access",
        "closed_at",
        "company_name",
        "contact_name",
        "cost",
        "created_at",
        "creator_name",
        "custom_fields",
        "date",
        "deal_number",
        "deal_status",
        "deals_first",
        "designated_approver",
        "end_date",
        "estimated_time",
        "expense",
        "expense_approval",
        "invoiced",
        "last_activity_at",
        "name",
        "number",
        "pending_invoicing",
        "probability",
        "profit",
        "profit_margin",
        "project_name",
        "projected_revenue",
        "purchase_order_number",
        "responsible",
        "responsible_name",
        "revenue",
        "sales_status_id",
        "services_revenue",
        "stage_status",
        "suffix",
        "time_approval",
        "time_to_close",
        "todo_due_date",
        "worked_time"
      ],
      "relationships": [
        "approval_policy_assignment",
        "automatic_invoicing_rule",
        "company",
        "contact",
        "contract",
        "creator",
        "custom_field_attachments",
        "custom_field_people",
        "deal_status",
        "designated_approver",
        "document_type",
        "expense_approval_workflow",
        "import",
        "invoice_template",
        "lost_reason",
        "next_todo",
        "organization",
        "origin_deal",
        "pipeline",
        "primary_contact",
        "project",
        "proposal_document_type",
        "responsible",
        "subsidiary",
        "tax_rate",
        "template",
        "time_approval_workflow"
      ]
    },
    "create": {
      "required": [
        "date",
        "deal_type_id",
        "name",
        "responsible_id"
      ],
      "attributes": [
        "budget",
        "budget_warning",
        "client_access",
        "color_id",
        "company_id",
        "contact_id",
        "currency",
        "custom_fields",
        "date",
        "deal_status_id",
        "deal_type_id",
        "deal_value",
        "deal_value_source",
        "delivered_on",
        "designated_approver_id",
        "destroy_future_bookings",
        "document_type_id",
        "editor_config",
        "end_date",
        "expense_approval",
        "lost_comment",
        "lost_reason_id",
        "man_day_minutes",
        "manual_invoicing_status_id",
        "name",
        "note",
        "origin_deal_id",
        "position",
        "probability",
        "project_id",
        "proposal_document_type_id",
        "proposal_note",
        "purchase_order_number",
        "responsible_id",
        "retainer_deal_value_type",
        "retainer_interval",
        "retainer_interval_count",
        "revenue_distribution_method",
        "revenue_distribution_type",
        "rounding_interval_id",
        "rounding_method_id",
        "sales_closed_on",
        "service_type_restricted_tracking",
        "subscriber_ids",
        "subsidiary_id",
        "tag_list",
        "tax_rate_id",
        "time_approval",
        "time_entry_requirements",
        "tracking_type_id",
        "validate_expense_when_closing"
      ],
      "relationships": []
    },
    "get": {
      "relationships": [
        "approval_policy_assignment",
        "automatic_invoicing_rule",
        "company",
        "contact",
        "contract",
        "creator",
        "custom_field_attachments",
        "custom_field_people",
        "deal_status",
        "designated_approver",
        "document_type",
        "expense_approval_workflow",
        "import",
        "invoice_template",
        "lost_reason",
        "next_todo",
        "organization",
        "origin_deal",
        "pipeline",
        "primary_contact",
        "project",
        "proposal_document_type",
        "responsible",
        "subsidiary",
        "tax_rate",
        "template",
        "time_approval_workflow"
      ]
    },
    "update": {
      "required": [
        "date",
        "deal_type_id",
        "name",
        "responsible_id"
      ],
      "attributes": [
        "budget",
        "budget_warning",
        "client_access",
        "color_id",
        "company_id",
        "contact_id",
        "currency",
        "custom_fields",
        "date",
        "deal_status_id",
        "deal_type_id",
        "deal_value",
        "deal_value_source",
        "delivered_on",
        "designated_approver_id",
        "destroy_future_bookings",
        "document_type_id",
        "editor_config",
        "end_date",
        "expense_approval",
        "lost_comment",
        "lost_reason_id",
        "man_day_minutes",
        "manual_invoicing_status_id",
        "name",
        "note",
        "origin_deal_id",
        "position",
        "probability",
        "project_id",
        "proposal_document_type_id",
        "proposal_note",
        "purchase_order_number",
        "responsible_id",
        "retainer_deal_value_type",
        "retainer_interval",
        "retainer_interval_count",
        "revenue_distribution_method",
        "revenue_distribution_type",
        "rounding_interval_id",
        "rounding_method_id",
        "sales_closed_on",
        "service_type_restricted_tracking",
        "subscriber_ids",
        "subsidiary_id",
        "tag_list",
        "tax_rate_id",
        "time_approval",
        "time_entry_requirements",
        "tracking_type_id",
        "validate_expense_when_closing"
      ],
      "relationships": []
    },
    "remove": true
  },
  "deleted_items": {
    "key": "deleted_items",
    "path": "/deleted_items",
    "tag": "Deleted Items",
    "tier": "write",
    "actions": [
      {
        "id": "PATCH /deleted_items/{id}/restore",
        "name": "restore",
        "method": "PATCH",
        "path": "/deleted_items/{id}/restore",
        "summary": "Restores deleted object",
        "requiresId": true,
        "tier": "write"
      }
    ],
    "list": {
      "filters": [
        "created_at",
        "deleter_id",
        "id",
        "item_type",
        "location",
        "name",
        "query"
      ],
      "sorts": [
        "created_at",
        "location",
        "name"
      ],
      "relationships": [
        "deleter",
        "organization"
      ]
    },
    "get": {
      "relationships": [
        "deleter",
        "organization"
      ]
    }
  },
  "discussions": {
    "key": "discussions",
    "path": "/discussions",
    "tag": "Discussions",
    "tier": "write",
    "actions": [
      {
        "id": "PATCH /discussions/{id}/reopen",
        "name": "reopen",
        "method": "PATCH",
        "path": "/discussions/{id}/reopen",
        "summary": "Reopens a discussion",
        "requiresId": true,
        "tier": "write"
      },
      {
        "id": "PATCH /discussions/{id}/resolve",
        "name": "resolve",
        "method": "PATCH",
        "path": "/discussions/{id}/resolve",
        "summary": "Resolves a discussion",
        "requiresId": true,
        "tier": "write"
      },
      {
        "id": "PATCH /discussions/{id}/subscribe",
        "name": "subscribe",
        "method": "PATCH",
        "path": "/discussions/{id}/subscribe",
        "summary": "Subscribes to discussion",
        "requiresId": true,
        "tier": "write"
      },
      {
        "id": "PATCH /discussions/{id}/unsubscribe",
        "name": "unsubscribe",
        "method": "PATCH",
        "path": "/discussions/{id}/unsubscribe",
        "summary": "Unsubscribes from discussion",
        "requiresId": true,
        "tier": "write"
      }
    ],
    "list": {
      "filters": [
        "id",
        "page_id",
        "status"
      ],
      "sorts": [
        "created_at",
        "resolved_at",
        "updated_at"
      ],
      "relationships": [
        "organization",
        "page"
      ]
    },
    "create": {
      "required": [],
      "attributes": [
        "excerpt",
        "page_id"
      ],
      "relationships": []
    },
    "get": {
      "relationships": [
        "organization",
        "page"
      ]
    },
    "update": {
      "required": [],
      "attributes": [
        "excerpt",
        "page_id"
      ],
      "relationships": []
    },
    "remove": true
  },
  "document_styles": {
    "key": "document_styles",
    "path": "/document_styles",
    "tag": "Document Styles",
    "tier": "financial",
    "actions": [
      {
        "id": "POST /document_styles/copy",
        "name": "copy",
        "method": "POST",
        "path": "/document_styles/copy",
        "summary": "Duplicates a document style",
        "requiresId": false,
        "tier": "financial"
      }
    ],
    "list": {
      "filters": [
        "id",
        "name"
      ],
      "sorts": [],
      "relationships": [
        "attachments",
        "organization"
      ]
    },
    "create": {
      "required": [],
      "attributes": [
        "attachment_ids",
        "name",
        "styles"
      ],
      "relationships": []
    },
    "get": {
      "relationships": [
        "attachments",
        "organization"
      ]
    },
    "update": {
      "required": [],
      "attributes": [
        "attachment_ids",
        "name",
        "styles"
      ],
      "relationships": []
    },
    "remove": true
  },
  "document_types": {
    "key": "document_types",
    "path": "/document_types",
    "tag": "Document Types",
    "tier": "financial",
    "actions": [
      {
        "id": "PATCH /document_types/{id}/archive",
        "name": "archive",
        "method": "PATCH",
        "path": "/document_types/{id}/archive",
        "summary": "Archives a document type",
        "requiresId": true,
        "tier": "financial"
      },
      {
        "id": "POST /document_types/copy",
        "name": "copy",
        "method": "POST",
        "path": "/document_types/copy",
        "summary": "Duplicates a document type",
        "requiresId": false,
        "tier": "financial"
      }
    ],
    "list": {
      "filters": [
        "document_template_id",
        "exportable_type_id",
        "id",
        "status",
        "subsidiary_id"
      ],
      "sorts": [],
      "relationships": [
        "attachments",
        "document_style",
        "organization",
        "subsidiary"
      ]
    },
    "create": {
      "required": [],
      "attributes": [
        "attachment_ids",
        "document_style_id",
        "document_template_id",
        "dual_currency",
        "email_data",
        "email_subject",
        "email_template",
        "exportable_type_id",
        "exporter_options",
        "filename_schema",
        "footer",
        "locale",
        "name",
        "note",
        "subsidiary_id",
        "tax1_name",
        "tax1_value",
        "tax2_name",
        "tax2_value",
        "template_options"
      ],
      "relationships": []
    },
    "get": {
      "relationships": [
        "attachments",
        "document_style",
        "organization",
        "subsidiary"
      ]
    },
    "update": {
      "required": [],
      "attributes": [
        "attachment_ids",
        "document_style_id",
        "document_template_id",
        "dual_currency",
        "email_data",
        "email_subject",
        "email_template",
        "exportable_type_id",
        "exporter_options",
        "filename_schema",
        "footer",
        "locale",
        "name",
        "note",
        "subsidiary_id",
        "tax1_name",
        "tax1_value",
        "tax2_name",
        "tax2_value",
        "template_options"
      ],
      "relationships": []
    }
  },
  "einvoice_identities": {
    "key": "einvoice_identities",
    "path": "/einvoice_identities",
    "tag": "E-invoice Identities",
    "tier": "financial",
    "actions": [],
    "list": {
      "filters": [
        "company_id",
        "subsidiary_id"
      ],
      "sorts": [],
      "relationships": [
        "company",
        "subsidiary"
      ]
    },
    "create": {
      "required": [],
      "attributes": [
        "buyer_reference",
        "company_id",
        "dir3_fiscal_code",
        "dir3_pagador_code",
        "dir3_receptor_code",
        "dire_code",
        "is_government_entity",
        "peppol_id",
        "subsidiary_id"
      ],
      "relationships": []
    },
    "get": {
      "relationships": [
        "company",
        "subsidiary"
      ]
    },
    "update": {
      "required": [],
      "attributes": [
        "buyer_reference",
        "company_id",
        "dir3_fiscal_code",
        "dir3_pagador_code",
        "dir3_receptor_code",
        "dire_code",
        "is_government_entity",
        "peppol_id",
        "subsidiary_id"
      ],
      "relationships": []
    }
  },
  "emails": {
    "key": "emails",
    "path": "/emails",
    "tag": "Emails",
    "tier": "write",
    "actions": [
      {
        "id": "PATCH /emails/{id}/attach",
        "name": "attach",
        "method": "PATCH",
        "path": "/emails/{id}/attach",
        "summary": "Attach an email",
        "requiresId": true,
        "tier": "write"
      },
      {
        "id": "PATCH /emails/{id}/dismiss",
        "name": "dismiss",
        "method": "PATCH",
        "path": "/emails/{id}/dismiss",
        "summary": "Dismiss an email",
        "requiresId": true,
        "tier": "write"
      }
    ],
    "get": {
      "relationships": [
        "attachments",
        "bcc_recipients",
        "cc_recipients",
        "creator",
        "deal",
        "integration",
        "invoice",
        "organization",
        "participants",
        "payment_reminder",
        "recipients",
        "thread",
        "to_recipients"
      ]
    },
    "remove": true,
    "list": {
      "filters": [
        "after",
        "before",
        "company_id",
        "creator_id",
        "deal_id",
        "id",
        "invoice_id",
        "project_id",
        "proposal_id",
        "purchase_order_id",
        "recipient_id",
        "sender_or_recipient_id",
        "status",
        "task_id",
        "thread_id"
      ],
      "sorts": [],
      "relationships": [
        "attachments",
        "bcc_recipients",
        "cc_recipients",
        "creator",
        "deal",
        "integration",
        "invoice",
        "organization",
        "participants",
        "payment_reminder",
        "recipients",
        "thread",
        "to_recipients"
      ]
    }
  },
  "entitlements": {
    "key": "entitlements",
    "path": "/entitlements",
    "tag": "Entitlements",
    "tier": "write",
    "actions": [],
    "list": {
      "filters": [
        "allocated",
        "date",
        "end_date",
        "event_id",
        "id",
        "person_id",
        "start_date",
        "used"
      ],
      "sorts": [
        "end_date",
        "event",
        "person",
        "start_date"
      ],
      "relationships": [
        "approval_workflow",
        "event",
        "organization",
        "person"
      ]
    },
    "create": {
      "required": [],
      "attributes": [
        "allocated",
        "end_date",
        "event_id",
        "note",
        "person_id",
        "start_date"
      ],
      "relationships": []
    },
    "get": {
      "relationships": [
        "approval_workflow",
        "event",
        "organization",
        "person"
      ]
    },
    "update": {
      "required": [],
      "attributes": [
        "allocated",
        "end_date",
        "event_id",
        "note",
        "person_id",
        "start_date"
      ],
      "relationships": []
    },
    "remove": true
  },
  "events": {
    "key": "events",
    "path": "/events",
    "tag": "Events",
    "tier": "write",
    "actions": [
      {
        "id": "PATCH /events/{id}/archive",
        "name": "archive",
        "method": "PATCH",
        "path": "/events/{id}/archive",
        "summary": "Archives an event",
        "requiresId": true,
        "tier": "write"
      }
    ],
    "list": {
      "filters": [
        "absence_type",
        "half_day_bookings",
        "id",
        "limitation_type",
        "limited",
        "name",
        "status",
        "sync_personal_integrations"
      ],
      "sorts": [],
      "relationships": [
        "organization"
      ]
    },
    "create": {
      "required": [
        "event_type_id",
        "limitation_type_id",
        "name"
      ],
      "attributes": [
        "absence_type",
        "color_id",
        "event_type_id",
        "half_day_bookings",
        "icon_id",
        "limitation_type_id",
        "name",
        "sync_personal_integrations"
      ],
      "relationships": []
    },
    "get": {
      "relationships": [
        "organization"
      ]
    },
    "update": {
      "required": [
        "event_type_id",
        "limitation_type_id",
        "name"
      ],
      "attributes": [
        "absence_type",
        "color_id",
        "event_type_id",
        "half_day_bookings",
        "icon_id",
        "limitation_type_id",
        "name",
        "sync_personal_integrations"
      ],
      "relationships": []
    },
    "remove": true
  },
  "exchange_rates": {
    "key": "exchange_rates",
    "path": "/exchange_rates",
    "tag": "Exchange Rates",
    "tier": "financial",
    "actions": [],
    "list": {
      "filters": [
        "date",
        "out_of_date"
      ],
      "sorts": [
        "date"
      ],
      "relationships": []
    }
  },
  "expenses": {
    "key": "expenses",
    "path": "/expenses",
    "tag": "Expenses",
    "tier": "financial",
    "actions": [
      {
        "id": "PATCH /expenses/{id}/approve",
        "name": "approve",
        "method": "PATCH",
        "path": "/expenses/{id}/approve",
        "summary": "Approves an expense",
        "requiresId": true,
        "tier": "financial",
        "body": {
          "required": [],
          "attributes": [
            "approver_id",
            "note"
          ],
          "relationships": []
        }
      },
      {
        "id": "PATCH /expenses/bulk_approve",
        "name": "bulk_bulk_approve",
        "method": "PATCH",
        "path": "/expenses/bulk_approve",
        "summary": "Bulk approves expenses",
        "requiresId": false,
        "collectionWide": true,
        "tier": "financial",
        "body": {
          "required": [],
          "attributes": [
            "ids"
          ],
          "relationships": []
        }
      },
      {
        "id": "DELETE /expenses",
        "name": "bulk_delete",
        "method": "DELETE",
        "path": "/expenses",
        "summary": "Delete expenses",
        "requiresId": false,
        "collectionWide": true,
        "tier": "financial"
      },
      {
        "id": "PATCH /expenses",
        "name": "bulk_update",
        "method": "PATCH",
        "path": "/expenses",
        "summary": "Update expenses",
        "requiresId": false,
        "collectionWide": true,
        "tier": "financial",
        "body": {
          "required": [],
          "attributes": [
            "amount",
            "attachment_id",
            "billable_amount",
            "currency",
            "custom_fields",
            "date",
            "markup",
            "name",
            "paid_on",
            "pay_on",
            "person_id",
            "position",
            "purchase_order_id",
            "quantity",
            "reimbursable",
            "reimbursed_on",
            "rejected_reason",
            "service_id",
            "tax_inclusion",
            "tax_rate_id",
            "vendor_id"
          ],
          "relationships": [],
          "borrowedShape": true
        }
      },
      {
        "id": "POST /expenses/copy",
        "name": "copy",
        "method": "POST",
        "path": "/expenses/copy",
        "summary": "Copy an expense",
        "requiresId": false,
        "tier": "financial",
        "body": {
          "required": [
            "service_id",
            "template_id"
          ],
          "attributes": [
            "name",
            "service_id",
            "template_id"
          ],
          "relationships": []
        }
      },
      {
        "id": "PATCH /expenses/{id}/export",
        "name": "export",
        "method": "PATCH",
        "path": "/expenses/{id}/export",
        "summary": "Exports an expense",
        "requiresId": true,
        "tier": "financial",
        "body": {
          "required": [],
          "attributes": [
            "account_reference_id",
            "company_reference_id",
            "payment_type"
          ],
          "relationships": []
        }
      },
      {
        "id": "PATCH /expenses/{id}/export_update",
        "name": "export_update",
        "method": "PATCH",
        "path": "/expenses/{id}/export_update",
        "summary": "Updates exported expense",
        "requiresId": true,
        "tier": "financial"
      },
      {
        "id": "PATCH /expenses/{id}/reject",
        "name": "reject",
        "method": "PATCH",
        "path": "/expenses/{id}/reject",
        "summary": "Rejects an expense",
        "requiresId": true,
        "tier": "financial",
        "body": {
          "required": [],
          "attributes": [
            "approver_id",
            "note",
            "rejected_reason"
          ],
          "relationships": []
        }
      },
      {
        "id": "PATCH /expenses/{id}/unapprove",
        "name": "unapprove",
        "method": "PATCH",
        "path": "/expenses/{id}/unapprove",
        "summary": "Unapproves an expense",
        "requiresId": true,
        "tier": "financial"
      },
      {
        "id": "PATCH /expenses/{id}/unreject",
        "name": "unreject",
        "method": "PATCH",
        "path": "/expenses/{id}/unreject",
        "summary": "Unrejects an expense",
        "requiresId": true,
        "tier": "financial",
        "body": {
          "required": [],
          "attributes": [
            "approver_id",
            "note"
          ],
          "relationships": []
        }
      }
    ],
    "list": {
      "filters": [
        "allocation_status",
        "amount",
        "amount_with_tax",
        "approval_status",
        "approved_at",
        "approver_id",
        "assigned_approver_id",
        "awaiting_approval_from_approver_id",
        "billable_amount",
        "company_id",
        "created_at",
        "creator_id",
        "currency",
        "custom_fields",
        "date",
        "date_after",
        "date_before",
        "deal_id",
        "designated_approver_id",
        "draft",
        "export_status",
        "full_query",
        "fuzzy_dates",
        "fuzzy_people",
        "id",
        "invoice_id",
        "invoiced",
        "invoicing_status",
        "jump_query",
        "name",
        "paid_on",
        "paid_on_after",
        "paid_on_before",
        "pay_on",
        "pay_on_after",
        "pay_on_before",
        "person_id",
        "profit",
        "project_id",
        "purchase_order_id",
        "quantity",
        "query",
        "quote_type",
        "recognized_revenue",
        "reimbursable",
        "reimbursed_on",
        "reimbursement",
        "responsible_id",
        "section_name",
        "service_id",
        "service_type_id",
        "stage_type",
        "status",
        "tax_rate_id",
        "updated_at",
        "updater_id",
        "vendor_id",
        "with_draft"
      ],
      "sorts": [
        "amount",
        "amount_with_tax",
        "billable_amount",
        "created_at",
        "custom_fields",
        "date",
        "deal_company_name",
        "deal_name",
        "deal_project_name",
        "draft",
        "id",
        "name",
        "paid_on",
        "pay_on",
        "profit",
        "recognized_revenue",
        "service_name",
        "service_type_name",
        "tax_rate_id"
      ],
      "relationships": [
        "approval_statuses",
        "approver",
        "attachment",
        "creator",
        "custom_field_attachments",
        "custom_field_people",
        "deal",
        "expense_line_items",
        "invoice_attribution",
        "organization",
        "person",
        "purchase_order",
        "rejecter",
        "service",
        "service_type",
        "tax_rate",
        "updater",
        "vendor"
      ]
    },
    "create": {
      "required": [
        "currency",
        "date",
        "name"
      ],
      "attributes": [
        "amount",
        "attachment_id",
        "billable_amount",
        "currency",
        "custom_fields",
        "date",
        "markup",
        "name",
        "paid_on",
        "pay_on",
        "person_id",
        "position",
        "purchase_order_id",
        "quantity",
        "reimbursable",
        "reimbursed_on",
        "rejected_reason",
        "service_id",
        "tax_inclusion",
        "tax_rate_id",
        "vendor_id"
      ],
      "relationships": []
    },
    "get": {
      "relationships": [
        "approval_statuses",
        "approver",
        "attachment",
        "creator",
        "custom_field_attachments",
        "custom_field_people",
        "deal",
        "expense_line_items",
        "invoice_attribution",
        "organization",
        "person",
        "purchase_order",
        "rejecter",
        "service",
        "service_type",
        "tax_rate",
        "updater",
        "vendor"
      ]
    },
    "update": {
      "required": [
        "currency",
        "date",
        "name"
      ],
      "attributes": [
        "amount",
        "attachment_id",
        "billable_amount",
        "currency",
        "custom_fields",
        "date",
        "markup",
        "name",
        "paid_on",
        "pay_on",
        "person_id",
        "position",
        "purchase_order_id",
        "quantity",
        "reimbursable",
        "reimbursed_on",
        "rejected_reason",
        "service_id",
        "tax_inclusion",
        "tax_rate_id",
        "vendor_id"
      ],
      "relationships": []
    },
    "remove": true
  },
  "filters": {
    "key": "filters",
    "path": "/filters",
    "tag": "Filters",
    "tier": "write",
    "actions": [],
    "list": {
      "filters": [
        "chart_type_id",
        "created_at",
        "creator_id",
        "filterable_collection",
        "filterable_id",
        "filterable_type",
        "id",
        "last_accessed_at",
        "last_pulse_sent_at",
        "last_viewed_at",
        "name",
        "project_id",
        "pulse",
        "query",
        "report",
        "report_category_id",
        "report_layout_id",
        "shared",
        "type_id",
        "updated_at"
      ],
      "sorts": [
        "created_at",
        "creator",
        "description",
        "filterable_collection",
        "last_accessed_at",
        "last_pulse_sent_at",
        "last_viewed_at",
        "name",
        "report_category_id",
        "updated_at"
      ],
      "relationships": [
        "creator",
        "memberships",
        "organization",
        "report_category",
        "template_object"
      ]
    },
    "create": {
      "required": [],
      "attributes": [
        "chart_type_id",
        "column_settings",
        "columns",
        "exchange_currency",
        "exchange_date",
        "filterable_collection",
        "filterable_id",
        "filterable_type",
        "formulas",
        "group_by",
        "hidden",
        "layout_id",
        "name",
        "params",
        "predefined_id",
        "public",
        "report",
        "report_category_id",
        "report_layout_id",
        "settings",
        "sort_by",
        "transpose_by",
        "type_id"
      ],
      "relationships": []
    },
    "get": {
      "relationships": [
        "creator",
        "memberships",
        "organization",
        "report_category",
        "template_object"
      ]
    },
    "update": {
      "required": [],
      "attributes": [
        "chart_type_id",
        "column_settings",
        "columns",
        "exchange_currency",
        "exchange_date",
        "filterable_collection",
        "filterable_id",
        "filterable_type",
        "formulas",
        "group_by",
        "hidden",
        "layout_id",
        "name",
        "params",
        "predefined_id",
        "public",
        "report",
        "report_category_id",
        "report_layout_id",
        "settings",
        "sort_by",
        "transpose_by",
        "type_id"
      ],
      "relationships": []
    },
    "remove": true
  },
  "folders": {
    "key": "folders",
    "path": "/folders",
    "tag": "Folders",
    "tier": "write",
    "actions": [
      {
        "id": "PATCH /folders/{id}/archive",
        "name": "archive",
        "method": "PATCH",
        "path": "/folders/{id}/archive",
        "summary": "Archives a folder",
        "requiresId": true,
        "tier": "write"
      },
      {
        "id": "POST /folders/copy",
        "name": "copy",
        "method": "POST",
        "path": "/folders/copy",
        "summary": "Copy a folder",
        "requiresId": false,
        "tier": "write",
        "body": {
          "required": [
            "name",
            "project_id",
            "template_id"
          ],
          "attributes": [
            "name",
            "project_id",
            "template_id"
          ],
          "relationships": []
        }
      },
      {
        "id": "PATCH /folders/{id}/move",
        "name": "move",
        "method": "PATCH",
        "path": "/folders/{id}/move",
        "summary": "Move a folder",
        "requiresId": true,
        "tier": "write",
        "body": {
          "required": [
            "project_id"
          ],
          "attributes": [
            "map",
            "project_id"
          ],
          "relationships": []
        }
      },
      {
        "id": "PATCH /folders/{id}/reposition",
        "name": "reposition",
        "method": "PATCH",
        "path": "/folders/{id}/reposition",
        "summary": "Reposition a folder",
        "requiresId": true,
        "tier": "write",
        "body": {
          "required": [],
          "attributes": [
            "move_after_id",
            "move_before_id"
          ],
          "relationships": []
        }
      },
      {
        "id": "PATCH /folders/{id}/restore",
        "name": "restore",
        "method": "PATCH",
        "path": "/folders/{id}/restore",
        "summary": "Restores a folder",
        "requiresId": true,
        "tier": "write"
      }
    ],
    "list": {
      "filters": [
        "id",
        "project_id",
        "query",
        "status"
      ],
      "sorts": [],
      "relationships": [
        "organization",
        "project"
      ]
    },
    "create": {
      "required": [
        "name",
        "project_id"
      ],
      "attributes": [
        "hidden",
        "name",
        "position",
        "project_id"
      ],
      "relationships": []
    },
    "get": {
      "relationships": [
        "organization",
        "project"
      ]
    },
    "update": {
      "required": [
        "name",
        "project_id"
      ],
      "attributes": [
        "hidden",
        "name",
        "position",
        "project_id"
      ],
      "relationships": []
    }
  },
  "holiday_calendars": {
    "key": "holiday_calendars",
    "path": "/holiday_calendars",
    "tag": "Holiday calendars",
    "tier": "write",
    "actions": [],
    "list": {
      "filters": [
        "id"
      ],
      "sorts": [],
      "relationships": [
        "organization"
      ]
    },
    "create": {
      "required": [
        "name"
      ],
      "attributes": [
        "autogenerate_holidays",
        "country",
        "name",
        "state"
      ],
      "relationships": []
    },
    "get": {
      "relationships": [
        "organization"
      ]
    },
    "update": {
      "required": [
        "name"
      ],
      "attributes": [
        "autogenerate_holidays",
        "country",
        "name",
        "state"
      ],
      "relationships": []
    },
    "remove": true
  },
  "holidays": {
    "key": "holidays",
    "path": "/holidays",
    "tag": "Holidays",
    "tier": "write",
    "actions": [],
    "list": {
      "filters": [
        "after",
        "before",
        "holiday_calendar_id"
      ],
      "sorts": [],
      "relationships": [
        "creator",
        "holiday_calendar",
        "organization"
      ]
    },
    "create": {
      "required": [
        "date",
        "holiday_calendar_id",
        "name"
      ],
      "attributes": [
        "date",
        "holiday_calendar_id",
        "name"
      ],
      "relationships": []
    },
    "get": {
      "relationships": [
        "creator",
        "holiday_calendar",
        "organization"
      ]
    },
    "update": {
      "required": [
        "date",
        "holiday_calendar_id",
        "name"
      ],
      "attributes": [
        "date",
        "holiday_calendar_id",
        "name"
      ],
      "relationships": []
    },
    "remove": true
  },
  "integration_exporter_configurations": {
    "key": "integration_exporter_configurations",
    "path": "/integration_exporter_configurations",
    "tag": "Integration Exporter Configuration",
    "tier": "admin",
    "actions": [],
    "list": {
      "filters": [
        "company_id"
      ],
      "sorts": [
        "client_id",
        "company_type"
      ],
      "relationships": [
        "company",
        "organization"
      ]
    },
    "create": {
      "required": [],
      "attributes": [
        "company_id",
        "company_type",
        "datev_client_account_code",
        "datev_vendor_account_code"
      ],
      "relationships": []
    },
    "get": {
      "relationships": [
        "company",
        "organization"
      ]
    },
    "update": {
      "required": [],
      "attributes": [
        "company_id",
        "company_type",
        "datev_client_account_code",
        "datev_vendor_account_code"
      ],
      "relationships": []
    },
    "remove": true
  },
  "integration_task_management_configurations": {
    "key": "integration_task_management_configurations",
    "path": "/integration_task_management_configurations",
    "tag": "Integration Task Management Configuration",
    "tier": "admin",
    "actions": [],
    "list": {
      "filters": [
        "deal_id",
        "integration_id",
        "project_id"
      ],
      "sorts": [
        "created_at",
        "deal_id",
        "id",
        "project_id"
      ],
      "relationships": [
        "deal",
        "default_person",
        "default_service",
        "integration",
        "organization",
        "project"
      ]
    },
    "create": {
      "required": [
        "integration_id",
        "jira_project"
      ],
      "attributes": [
        "deal_id",
        "default_person_id",
        "default_service_id",
        "integration_id",
        "jira_board",
        "jira_hierarchy_resolution_enabled",
        "jira_project",
        "jira_screens",
        "project_id"
      ],
      "relationships": []
    },
    "get": {
      "relationships": [
        "deal",
        "default_person",
        "default_service",
        "integration",
        "organization",
        "project"
      ]
    },
    "update": {
      "required": [],
      "attributes": [
        "default_person_id",
        "default_service_id",
        "jira_board",
        "jira_hierarchy_resolution_enabled",
        "jira_project",
        "jira_screens"
      ],
      "relationships": []
    },
    "remove": true
  },
  "integrations": {
    "key": "integrations",
    "path": "/integrations",
    "tag": "Integrations",
    "tier": "admin",
    "actions": [
      {
        "id": "GET /integrations/{id}/check",
        "name": "check",
        "method": "GET",
        "path": "/integrations/{id}/check",
        "summary": "Checks if integration is valid",
        "requiresId": true,
        "tier": "admin"
      },
      {
        "id": "PATCH /integrations/{id}/connect",
        "name": "connect",
        "method": "PATCH",
        "path": "/integrations/{id}/connect",
        "summary": "",
        "requiresId": true,
        "tier": "admin"
      }
    ],
    "list": {
      "filters": [
        "deal_id",
        "integration_type_id",
        "jira_organization",
        "jira_project",
        "project_id",
        "project_status",
        "subsidiary_id"
      ],
      "sorts": [
        "created_at",
        "id"
      ],
      "relationships": [
        "creator",
        "deal",
        "organization",
        "project",
        "subsidiary"
      ]
    },
    "get": {
      "relationships": [
        "creator",
        "deal",
        "organization",
        "project",
        "subsidiary"
      ]
    },
    "remove": true
  },
  "invitations": {
    "key": "invitations",
    "path": "/invitations",
    "tag": "Invitations",
    "tier": "admin",
    "actions": [],
    "create": {
      "required": [],
      "attributes": [
        "first_name",
        "last_name",
        "newsletter_consent",
        "password"
      ],
      "relationships": []
    },
    "get": {
      "relationships": []
    },
    "update": {
      "required": [],
      "attributes": [
        "first_name",
        "last_name",
        "newsletter_consent",
        "password"
      ],
      "relationships": []
    }
  },
  "invoice_attributions": {
    "key": "invoice_attributions",
    "path": "/invoice_attributions",
    "tag": "Invoice Attributions",
    "tier": "financial",
    "actions": [],
    "list": {
      "filters": [
        "budget_id",
        "invoice_id"
      ],
      "sorts": [],
      "relationships": [
        "budget",
        "invoice",
        "organization"
      ]
    },
    "create": {
      "required": [
        "amount",
        "budget_id",
        "invoice_id"
      ],
      "attributes": [
        "amount",
        "budget_id",
        "date_from",
        "date_to",
        "invoice_id"
      ],
      "relationships": []
    },
    "get": {
      "relationships": [
        "budget",
        "invoice",
        "organization"
      ]
    },
    "update": {
      "required": [
        "amount",
        "budget_id",
        "invoice_id"
      ],
      "attributes": [
        "amount",
        "budget_id",
        "date_from",
        "date_to",
        "invoice_id"
      ],
      "relationships": []
    },
    "remove": true
  },
  "invoice_templates": {
    "key": "invoice_templates",
    "path": "/invoice_templates",
    "tag": "Invoice Templates",
    "tier": "financial",
    "actions": [],
    "list": {
      "filters": [
        "budget_id",
        "company_id",
        "creator_id",
        "custom_fields",
        "document_type_id",
        "id",
        "issuer_id",
        "subsidiary_id"
      ],
      "sorts": [
        "created_at",
        "id"
      ],
      "relationships": [
        "bank_account",
        "budget",
        "creator",
        "document_type",
        "issuer",
        "organization",
        "subsidiary"
      ]
    },
    "create": {
      "required": [],
      "attributes": [
        "bank_account_details",
        "bank_account_id",
        "budget_id",
        "custom_fields",
        "document_type_id",
        "invoice_creation_options",
        "issuer_id",
        "note",
        "subsidiary_id"
      ],
      "relationships": []
    },
    "get": {
      "relationships": [
        "bank_account",
        "budget",
        "creator",
        "document_type",
        "issuer",
        "organization",
        "subsidiary"
      ]
    },
    "update": {
      "required": [],
      "attributes": [
        "bank_account_details",
        "bank_account_id",
        "budget_id",
        "custom_fields",
        "document_type_id",
        "invoice_creation_options",
        "issuer_id",
        "note",
        "subsidiary_id"
      ],
      "relationships": []
    },
    "remove": true
  },
  "invoices": {
    "key": "invoices",
    "path": "/invoices",
    "tag": "Invoices",
    "tier": "financial",
    "actions": [
      {
        "id": "PATCH /invoices/{id}/export",
        "name": "export",
        "method": "PATCH",
        "path": "/invoices/{id}/export",
        "summary": "Exports an invoice",
        "requiresId": true,
        "tier": "financial"
      },
      {
        "id": "PATCH /invoices/{id}/export_update",
        "name": "export_update",
        "method": "PATCH",
        "path": "/invoices/{id}/export_update",
        "summary": "Updates an exported invoice",
        "requiresId": true,
        "tier": "financial"
      },
      {
        "id": "PATCH /invoices/{id}/finalize",
        "name": "finalize",
        "method": "PATCH",
        "path": "/invoices/{id}/finalize",
        "summary": "Finalizes an invoice",
        "requiresId": true,
        "tier": "financial"
      },
      {
        "id": "GET /invoices/{id}/preview",
        "name": "preview",
        "method": "GET",
        "path": "/invoices/{id}/preview",
        "summary": "Preview invoice",
        "requiresId": true,
        "tier": "financial"
      },
      {
        "id": "PATCH /invoices/{id}/send",
        "name": "send",
        "method": "PATCH",
        "path": "/invoices/{id}/send",
        "summary": "Sends an invoice",
        "requiresId": true,
        "tier": "financial",
        "outward": true
      },
      {
        "id": "PATCH /invoices/{id}/send_einvoice",
        "name": "send_einvoice",
        "method": "PATCH",
        "path": "/invoices/{id}/send_einvoice",
        "summary": "Sends an e-invoice",
        "requiresId": true,
        "tier": "financial",
        "outward": true,
        "body": {
          "required": [],
          "attributes": [
            "business_process",
            "format_id"
          ],
          "relationships": []
        }
      }
    ],
    "list": {
      "filters": [
        "amount",
        "amount_credited",
        "amount_credited_with_tax",
        "amount_paid",
        "amount_tax",
        "amount_unpaid",
        "amount_with_tax",
        "amount_written_off",
        "automatically_created",
        "company_id",
        "created_at",
        "creator_id",
        "credited",
        "currency",
        "custom_fields",
        "deal_id",
        "delivery_on",
        "export_status",
        "full_query",
        "fuzzy_dates",
        "fuzzy_people",
        "id",
        "invoice_aging",
        "invoice_state",
        "invoice_status",
        "invoice_type",
        "invoiced_on",
        "invoicing_method",
        "issuer_id",
        "jump_query",
        "last_activity_at",
        "number",
        "overdue_status",
        "paid_on",
        "parent_company_id",
        "parent_invoice_id",
        "pay_on",
        "payment_status",
        "payment_terms",
        "payment_terms_type",
        "project_id",
        "purchase_order_number",
        "query",
        "responsible_id",
        "sent_on",
        "sent_status",
        "status",
        "subscriber_id",
        "subsidiary_id",
        "tags"
      ],
      "sorts": [
        "amount",
        "amount_credited",
        "amount_credited_with_tax",
        "amount_paid",
        "amount_tax",
        "amount_with_tax",
        "amount_written_off",
        "company_name",
        "created_at",
        "credited",
        "custom_fields",
        "deleted_at",
        "delivery_on",
        "discount",
        "invoiced_on",
        "last_activity_at",
        "number",
        "pay_on",
        "purchase_order_number",
        "sent_on",
        "subject"
      ],
      "relationships": [
        "attachment",
        "bank_account",
        "bill_from",
        "bill_to",
        "company",
        "creator",
        "custom_field_attachments",
        "custom_field_people",
        "document_type",
        "invoice_attributions",
        "issuer",
        "organization",
        "parent_invoice",
        "subsidiary"
      ]
    },
    "create": {
      "required": [
        "company_id",
        "currency",
        "invoiced_on"
      ],
      "attributes": [
        "attachment_id",
        "bank_account_details",
        "bank_account_id",
        "company_id",
        "creation_options",
        "currency",
        "custom_fields",
        "delivery_on",
        "discount",
        "document_type_id",
        "export_id",
        "export_invoice_url",
        "exported",
        "invoice_type_id",
        "invoiced_on",
        "issuer_id",
        "note",
        "number",
        "parent_invoice_id",
        "pay_on",
        "pay_on_relative",
        "payment_terms_days",
        "payment_terms_type",
        "purchase_order_number",
        "sent_on",
        "subject",
        "subscriber_ids",
        "subsidiary_id",
        "tag_list",
        "tax1_name",
        "tax1_value",
        "tax2_name",
        "tax2_value"
      ],
      "relationships": []
    },
    "get": {
      "relationships": [
        "attachment",
        "bank_account",
        "bill_from",
        "bill_to",
        "company",
        "creator",
        "custom_field_attachments",
        "custom_field_people",
        "document_type",
        "invoice_attributions",
        "issuer",
        "organization",
        "parent_invoice",
        "subsidiary"
      ]
    },
    "update": {
      "required": [
        "company_id",
        "currency",
        "invoiced_on"
      ],
      "attributes": [
        "attachment_id",
        "bank_account_details",
        "bank_account_id",
        "company_id",
        "creation_options",
        "currency",
        "custom_fields",
        "delivery_on",
        "discount",
        "document_type_id",
        "export_id",
        "export_invoice_url",
        "exported",
        "invoice_type_id",
        "invoiced_on",
        "issuer_id",
        "note",
        "number",
        "parent_invoice_id",
        "pay_on",
        "pay_on_relative",
        "payment_terms_days",
        "payment_terms_type",
        "purchase_order_number",
        "sent_on",
        "subject",
        "subscriber_ids",
        "subsidiary_id",
        "tag_list",
        "tax1_name",
        "tax1_value",
        "tax2_name",
        "tax2_value"
      ],
      "relationships": []
    },
    "remove": true
  },
  "job_roles": {
    "key": "job_roles",
    "path": "/job_roles",
    "tag": "Job Role",
    "tier": "admin",
    "actions": [
      {
        "id": "PATCH /job_roles/{id}/archive",
        "name": "archive",
        "method": "PATCH",
        "path": "/job_roles/{id}/archive",
        "summary": "Archives the job role",
        "requiresId": true,
        "tier": "admin"
      },
      {
        "id": "PATCH /job_roles/{id}/restore",
        "name": "restore",
        "method": "PATCH",
        "path": "/job_roles/{id}/restore",
        "summary": "Restores the job role",
        "requiresId": true,
        "tier": "admin"
      }
    ],
    "list": {
      "filters": [
        "id",
        "query",
        "status"
      ],
      "sorts": [],
      "relationships": [
        "organization"
      ]
    },
    "create": {
      "required": [
        "name"
      ],
      "attributes": [
        "name"
      ],
      "relationships": []
    },
    "get": {
      "relationships": [
        "organization"
      ]
    },
    "update": {
      "required": [
        "name"
      ],
      "attributes": [
        "name"
      ],
      "relationships": []
    }
  },
  "line_items": {
    "key": "line_items",
    "path": "/line_items",
    "tag": "Line Items",
    "tier": "financial",
    "actions": [
      {
        "id": "DELETE /line_items",
        "name": "bulk_delete",
        "method": "DELETE",
        "path": "/line_items",
        "summary": "Delete line items",
        "requiresId": false,
        "collectionWide": true,
        "tier": "financial"
      },
      {
        "id": "PATCH /line_items",
        "name": "bulk_update",
        "method": "PATCH",
        "path": "/line_items",
        "summary": "Update line items",
        "requiresId": false,
        "collectionWide": true,
        "tier": "financial",
        "body": {
          "required": [],
          "attributes": [
            "discount",
            "expense_id",
            "invoice_id",
            "kpd_code_id",
            "position",
            "quantity",
            "service_id",
            "service_type_id",
            "tax_name",
            "tax_rate_id",
            "tax_value",
            "unit_id",
            "unit_price"
          ],
          "relationships": [],
          "borrowedShape": true
        }
      },
      {
        "id": "POST /line_items/generate",
        "name": "generate",
        "method": "POST",
        "path": "/line_items/generate",
        "summary": "Create line items",
        "requiresId": false,
        "tier": "financial"
      }
    ],
    "list": {
      "filters": [
        "company_id",
        "creator_id",
        "discount",
        "expense_id",
        "id",
        "invoice_id",
        "service_id",
        "service_type_id",
        "tax_name",
        "tax_value",
        "unit_id",
        "updater_id"
      ],
      "sorts": [],
      "relationships": [
        "expense",
        "invoice",
        "kpd_code",
        "organization",
        "service",
        "service_type",
        "tax_rate"
      ]
    },
    "create": {
      "required": [
        "invoice_id",
        "quantity",
        "tax_rate_id",
        "unit_price"
      ],
      "attributes": [
        "discount",
        "expense_id",
        "invoice_id",
        "kpd_code_id",
        "position",
        "quantity",
        "service_id",
        "service_type_id",
        "tax_name",
        "tax_rate_id",
        "tax_value",
        "unit_id",
        "unit_price"
      ],
      "relationships": []
    },
    "get": {
      "relationships": [
        "expense",
        "invoice",
        "kpd_code",
        "organization",
        "service",
        "service_type",
        "tax_rate"
      ]
    },
    "update": {
      "required": [
        "invoice_id",
        "quantity",
        "tax_rate_id",
        "unit_price"
      ],
      "attributes": [
        "discount",
        "expense_id",
        "invoice_id",
        "kpd_code_id",
        "position",
        "quantity",
        "service_id",
        "service_type_id",
        "tax_name",
        "tax_rate_id",
        "tax_value",
        "unit_id",
        "unit_price"
      ],
      "relationships": []
    },
    "remove": true
  },
  "lost_reasons": {
    "key": "lost_reasons",
    "path": "/lost_reasons",
    "tag": "Lost Reasons",
    "tier": "write",
    "actions": [
      {
        "id": "PATCH /lost_reasons/{id}/archive",
        "name": "archive",
        "method": "PATCH",
        "path": "/lost_reasons/{id}/archive",
        "summary": "Archives a lost reason",
        "requiresId": true,
        "tier": "write"
      }
    ],
    "list": {
      "filters": [
        "id"
      ],
      "sorts": [],
      "relationships": [
        "organization"
      ]
    },
    "create": {
      "required": [
        "name"
      ],
      "attributes": [
        "name"
      ],
      "relationships": []
    },
    "get": {
      "relationships": [
        "organization"
      ]
    },
    "update": {
      "required": [
        "name"
      ],
      "attributes": [
        "name"
      ],
      "relationships": []
    }
  },
  "memberships": {
    "key": "memberships",
    "path": "/memberships",
    "tag": "Memberships",
    "tier": "admin",
    "actions": [],
    "list": {
      "filters": [
        "access_type_id",
        "agent_id",
        "dashboard_id",
        "deal_id",
        "dynamic_group_id",
        "filter_id",
        "id",
        "meeting_id",
        "page_id",
        "person_id",
        "project_id",
        "survey_id",
        "target_id",
        "target_type",
        "type_id"
      ],
      "sorts": [],
      "relationships": [
        "agent",
        "dashboard",
        "deal",
        "filter",
        "organization",
        "page",
        "person",
        "project",
        "survey",
        "team"
      ]
    },
    "create": {
      "required": [],
      "attributes": [
        "agent_id",
        "dashboard_id",
        "deal_id",
        "filter_id",
        "meeting_id",
        "page_id",
        "project_id",
        "pulse_id",
        "survey_id"
      ],
      "relationships": []
    },
    "get": {
      "relationships": [
        "agent",
        "dashboard",
        "deal",
        "filter",
        "organization",
        "page",
        "person",
        "project",
        "survey",
        "team"
      ]
    },
    "update": {
      "required": [],
      "attributes": [
        "agent_id",
        "dashboard_id",
        "deal_id",
        "filter_id",
        "meeting_id",
        "page_id",
        "project_id",
        "pulse_id",
        "survey_id"
      ],
      "relationships": []
    },
    "remove": true
  },
  "notifications": {
    "key": "notifications",
    "path": "/notifications",
    "tag": "Notifications",
    "tier": "write",
    "actions": [
      {
        "id": "PATCH /notifications/{id}/dismiss",
        "name": "dismiss",
        "method": "PATCH",
        "path": "/notifications/{id}/dismiss",
        "summary": "Dismisses a notification",
        "requiresId": true,
        "tier": "write"
      },
      {
        "id": "PATCH /notifications/{id}/read",
        "name": "read",
        "method": "PATCH",
        "path": "/notifications/{id}/read",
        "summary": "Reads a notification",
        "requiresId": true,
        "tier": "write"
      },
      {
        "id": "PATCH /notifications/{id}/undismiss",
        "name": "undismiss",
        "method": "PATCH",
        "path": "/notifications/{id}/undismiss",
        "summary": "Undismisses a notification",
        "requiresId": true,
        "tier": "write"
      },
      {
        "id": "PATCH /notifications/{id}/unread",
        "name": "unread",
        "method": "PATCH",
        "path": "/notifications/{id}/unread",
        "summary": "Marks a notification as unread",
        "requiresId": true,
        "tier": "write"
      }
    ],
    "list": {
      "filters": [
        "after",
        "before",
        "date_after",
        "date_before",
        "dismissed",
        "id",
        "important",
        "last_action_at",
        "mention",
        "project_id",
        "type"
      ],
      "sorts": [],
      "relationships": [
        "actor",
        "organization",
        "owner"
      ]
    },
    "get": {
      "relationships": [
        "actor",
        "organization",
        "owner"
      ]
    }
  },
  "organization_memberships": {
    "key": "organization_memberships",
    "path": "/organization_memberships",
    "tag": "Organization Memberships",
    "tier": "admin",
    "actions": [
      {
        "id": "PATCH /organization_memberships/{id}/clear_notifications",
        "name": "clear_notifications",
        "method": "PATCH",
        "path": "/organization_memberships/{id}/clear_notifications",
        "summary": "Clear notifications for organization membership",
        "requiresId": true,
        "tier": "write"
      },
      {
        "id": "PATCH /organization_memberships/{id}/dismiss_notifications",
        "name": "dismiss_notifications",
        "method": "PATCH",
        "path": "/organization_memberships/{id}/dismiss_notifications",
        "summary": "Dismiss notifications for organization membership",
        "requiresId": true,
        "tier": "write"
      },
      {
        "id": "PATCH /organization_memberships/{id}/read_notifications",
        "name": "read_notifications",
        "method": "PATCH",
        "path": "/organization_memberships/{id}/read_notifications",
        "summary": "Mark all notifications as read for organization membership",
        "requiresId": true,
        "tier": "write"
      }
    ],
    "get": {
      "relationships": [
        "booking_approvals_favorite_filter",
        "bookings_favorite_filter",
        "budget_services_favorite_filter",
        "budgets_favorite_filter",
        "companies_favorite_filter",
        "company_time_favorite_filter",
        "contacts_favorite_filter",
        "deal_services_favorite_filter",
        "deals_favorite_filter",
        "docs_favorite_filter",
        "employees_favorite_filter",
        "expense_approvals_favorite_filter",
        "expenses_favorite_filter",
        "internal_budget_services_favorite_filter",
        "invoices_favorite_filter",
        "organization",
        "payments_favorite_filter",
        "people_favorite_filter",
        "person",
        "projects_favorite_filter",
        "salary_reports_favorite_filter",
        "tasks_favorite_filter",
        "time_approvals_favorite_filter",
        "time_entry_reports_favorite_filter",
        "time_reports_favorite_filter",
        "time_tracking_policy",
        "user"
      ]
    },
    "update": {
      "required": [],
      "attributes": [
        "booking_approvals_filter_id",
        "bookings_filter_id",
        "budget_services_filter_id",
        "budgets_filter_id",
        "companies_filter_id",
        "company_time_filter_id",
        "contacts_filter_id",
        "deal_services_filter_id",
        "deals_filter_id",
        "docs_filter_id",
        "email_notifications",
        "employees_filter_id",
        "expense_approvals_filter_id",
        "expenses_filter_id",
        "granular_notification_preferences",
        "internal_budget_services_filter_id",
        "invoices_filter_id",
        "payments_filter_id",
        "people_filter_id",
        "preferences",
        "projects_filter_id",
        "quick_start_config",
        "salary_reports_filter_id",
        "tasks_filter_id",
        "time_approvals_filter_id",
        "time_entry_reports_filter_id",
        "time_reminders",
        "time_reports_filter_id",
        "weekly_emails"
      ],
      "relationships": []
    },
    "remove": true,
    "list": {
      "filters": [
        "organization_id"
      ],
      "sorts": [],
      "relationships": [
        "booking_approvals_favorite_filter",
        "bookings_favorite_filter",
        "budget_services_favorite_filter",
        "budgets_favorite_filter",
        "companies_favorite_filter",
        "company_time_favorite_filter",
        "contacts_favorite_filter",
        "deal_services_favorite_filter",
        "deals_favorite_filter",
        "docs_favorite_filter",
        "employees_favorite_filter",
        "expense_approvals_favorite_filter",
        "expenses_favorite_filter",
        "internal_budget_services_favorite_filter",
        "invoices_favorite_filter",
        "organization",
        "payments_favorite_filter",
        "people_favorite_filter",
        "person",
        "projects_favorite_filter",
        "salary_reports_favorite_filter",
        "tasks_favorite_filter",
        "time_approvals_favorite_filter",
        "time_entry_reports_favorite_filter",
        "time_reports_favorite_filter",
        "time_tracking_policy",
        "user"
      ]
    }
  },
  "organizations": {
    "key": "organizations",
    "path": "/organizations",
    "tag": "Organizations",
    "tier": "admin",
    "actions": [
      {
        "id": "PATCH /organizations/{id}/resend_code",
        "name": "resend_code",
        "method": "PATCH",
        "path": "/organizations/{id}/resend_code",
        "summary": "Resend verification code",
        "requiresId": true,
        "tier": "admin",
        "outward": true
      }
    ],
    "get": {
      "relationships": [
        "company",
        "organization_subscription",
        "owner"
      ]
    },
    "update": {
      "required": [],
      "attributes": [
        "addons",
        "ai_enabled",
        "allow_time_off",
        "allow_user_email",
        "autotracking_schedule_id",
        "avatar_url",
        "booked_demo",
        "conflict_resolver_active",
        "currency",
        "currency_format_id",
        "date_format_id",
        "deal_settings",
        "decimal_places_id",
        "delivered_budget_recognition_date_id",
        "due_days",
        "email_local_name",
        "email_sender_name",
        "email_type_id",
        "expense_markup",
        "expense_settings",
        "facility_costs",
        "facility_costs_breakdown",
        "financial_month_locking_date",
        "financial_month_locking_partial_edit",
        "fiscal_year_start",
        "invoice_rounding_method_id",
        "invoice_timesheet_export_configuration",
        "limited_service_types",
        "locale",
        "man_day_minutes",
        "name",
        "number_format_id",
        "numbering_format_settings",
        "onboarding_progress",
        "open_budget_recognition_date_id",
        "overhead",
        "overhead_amortization_period",
        "overhead_recalculation_day",
        "overhead_subsidiary_switched_at",
        "overhead_type_id",
        "owner_id",
        "payment_terms_type",
        "quick_start_config",
        "remove_branding",
        "request_for_resource_enabled",
        "revenue_recognition_type_id",
        "rounding_interval_id",
        "rounding_method_id",
        "time_display_id",
        "time_format_id",
        "time_locking",
        "time_locking_interval",
        "time_locking_period_id",
        "time_locking_reminders",
        "time_reminder_at",
        "time_reminder_condition",
        "time_reminder_id",
        "time_reminders",
        "time_tracking_policies_enabled",
        "time_tracking_policy_id",
        "time_zone",
        "timesheet_submission",
        "timesheet_submission_reminders",
        "timesheet_submission_settings",
        "week_start_day_id",
        "working_hours"
      ],
      "relationships": []
    },
    "remove": true,
    "list": {
      "filters": [],
      "sorts": [
        "name"
      ],
      "relationships": [
        "company",
        "organization_subscription",
        "owner"
      ]
    }
  },
  "overheads": {
    "key": "overheads",
    "path": "/overheads",
    "tag": "Overheads",
    "tier": "financial",
    "actions": [
      {
        "id": "PATCH /overheads/{id}/recalculate",
        "name": "recalculate",
        "method": "PATCH",
        "path": "/overheads/{id}/recalculate",
        "summary": "Recalculate an overhead",
        "requiresId": true,
        "tier": "financial"
      }
    ],
    "list": {
      "filters": [
        "overhead_type_id",
        "subsidiary_id"
      ],
      "sorts": [
        "ended_on",
        "started_on"
      ],
      "relationships": [
        "organization",
        "subsidiary",
        "updater"
      ]
    },
    "get": {
      "relationships": [
        "organization",
        "subsidiary",
        "updater"
      ]
    },
    "update": {
      "required": [],
      "attributes": [
        "averaging_period",
        "facility_costs",
        "facility_costs_breakdown",
        "overhead_controls",
        "use_overhead"
      ],
      "relationships": []
    }
  },
  "page_versions": {
    "key": "page_versions",
    "path": "/page_versions",
    "tag": "PageVersions",
    "tier": "write",
    "actions": [],
    "list": {
      "filters": [
        "id",
        "page_id",
        "person_id",
        "restored_from_version_id"
      ],
      "sorts": [
        "created_at",
        "name",
        "updated_at"
      ],
      "relationships": [
        "organization",
        "page",
        "person"
      ]
    },
    "create": {
      "required": [],
      "attributes": [
        "name",
        "page_id",
        "restored_from_version_id"
      ],
      "relationships": []
    },
    "get": {
      "relationships": [
        "organization",
        "page",
        "person"
      ]
    },
    "update": {
      "required": [],
      "attributes": [
        "name",
        "page_id",
        "restored_from_version_id"
      ],
      "relationships": []
    }
  },
  "pages": {
    "key": "pages",
    "path": "/pages",
    "tag": "Pages",
    "tier": "write",
    "actions": [
      {
        "id": "PATCH /pages/{id}/append_html",
        "name": "append_html",
        "method": "PATCH",
        "path": "/pages/{id}/append_html",
        "summary": "Append HTML to a page body",
        "requiresId": true,
        "tier": "write"
      },
      {
        "id": "PATCH /pages/{id}/append_markdown",
        "name": "append_markdown",
        "method": "PATCH",
        "path": "/pages/{id}/append_markdown",
        "summary": "Append markdown to a page body",
        "requiresId": true,
        "tier": "write"
      },
      {
        "id": "POST /pages/copy",
        "name": "copy",
        "method": "POST",
        "path": "/pages/copy",
        "summary": "Copies a page",
        "requiresId": false,
        "tier": "write"
      },
      {
        "id": "POST /pages/create_with_markdown",
        "name": "create_with_markdown",
        "method": "POST",
        "path": "/pages/create_with_markdown",
        "summary": "Create a page with markdown body",
        "requiresId": false,
        "tier": "write",
        "body": {
          "required": [
            "markdown"
          ],
          "attributes": [
            "attachment_ids",
            "cover_image_url",
            "custom_fields",
            "icon_id",
            "markdown",
            "parent_page_id",
            "position",
            "preferences",
            "project_id",
            "root_page_id",
            "title"
          ],
          "relationships": []
        }
      },
      {
        "id": "PATCH /pages/{id}/move",
        "name": "move",
        "method": "PATCH",
        "path": "/pages/{id}/move",
        "summary": "Moves a page",
        "requiresId": true,
        "tier": "write"
      },
      {
        "id": "PATCH /pages/{id}/publish",
        "name": "publish",
        "method": "PATCH",
        "path": "/pages/{id}/publish",
        "summary": "Publishes a page",
        "requiresId": true,
        "tier": "write"
      },
      {
        "id": "PATCH /pages/{id}/replace_body_with_html",
        "name": "replace_body_with_html",
        "method": "PATCH",
        "path": "/pages/{id}/replace_body_with_html",
        "summary": "Replace a page body with HTML",
        "requiresId": true,
        "tier": "write"
      },
      {
        "id": "PATCH /pages/{id}/replace_body_with_markdown",
        "name": "replace_body_with_markdown",
        "method": "PATCH",
        "path": "/pages/{id}/replace_body_with_markdown",
        "summary": "Replace a page body with markdown",
        "requiresId": true,
        "tier": "write"
      },
      {
        "id": "PATCH /pages/{id}/unpublish",
        "name": "unpublish",
        "method": "PATCH",
        "path": "/pages/{id}/unpublish",
        "summary": "Unpublishes a page",
        "requiresId": true,
        "tier": "write"
      }
    ],
    "get": {
      "relationships": [
        "attachments",
        "creator",
        "organization",
        "parent_page",
        "project",
        "root_page",
        "template_object"
      ]
    },
    "remove": true,
    "list": {
      "filters": [
        "created_at",
        "creator_id",
        "custom_fields",
        "edited_at",
        "full_query",
        "fuzzy_dates",
        "fuzzy_people",
        "id",
        "jump_query",
        "last_activity_at",
        "parent_page_id",
        "person_type",
        "project_id",
        "project_status",
        "query",
        "root_page_id",
        "status",
        "subscriber_id",
        "template"
      ],
      "sorts": [
        "created_at",
        "creator_name",
        "edited_at",
        "id",
        "last_activity_at",
        "project",
        "project_name",
        "title",
        "updated_at"
      ],
      "relationships": [
        "attachments",
        "creator",
        "organization",
        "parent_page",
        "project",
        "root_page",
        "template_object"
      ]
    }
  },
  "payment_reminder_sequences": {
    "key": "payment_reminder_sequences",
    "path": "/payment_reminder_sequences",
    "tag": "Payment reminder sequences",
    "tier": "financial",
    "actions": [],
    "list": {
      "filters": [
        "default_sequence"
      ],
      "sorts": [
        "default_sequence"
      ],
      "relationships": [
        "creator",
        "organization",
        "payment_reminders",
        "updater"
      ]
    },
    "create": {
      "required": [],
      "attributes": [
        "default_sequence",
        "name"
      ],
      "relationships": []
    },
    "get": {
      "relationships": [
        "creator",
        "organization",
        "payment_reminders",
        "updater"
      ]
    },
    "update": {
      "required": [],
      "attributes": [
        "default_sequence",
        "name"
      ],
      "relationships": []
    },
    "remove": true
  },
  "payments": {
    "key": "payments",
    "path": "/payments",
    "tag": "Payments",
    "tier": "financial",
    "actions": [],
    "list": {
      "filters": [
        "amount",
        "budget_id",
        "company_id",
        "external_id",
        "id",
        "invoice_id",
        "number",
        "paid_after",
        "paid_before",
        "paid_on",
        "project_id",
        "query",
        "subsidiary_id",
        "written_off_on"
      ],
      "sorts": [
        "amount",
        "date",
        "invoice_number",
        "note",
        "paid_on",
        "written_off_on"
      ],
      "relationships": [
        "invoice",
        "organization"
      ]
    },
    "create": {
      "required": [
        "amount",
        "invoice_id"
      ],
      "attributes": [
        "amount",
        "invoice_id",
        "note",
        "paid_on",
        "written_off_on"
      ],
      "relationships": []
    },
    "get": {
      "relationships": [
        "invoice",
        "organization"
      ]
    },
    "update": {
      "required": [
        "amount",
        "invoice_id"
      ],
      "attributes": [
        "amount",
        "invoice_id",
        "note",
        "paid_on",
        "written_off_on"
      ],
      "relationships": []
    },
    "remove": true
  },
  "people": {
    "key": "people",
    "path": "/people",
    "tag": "People",
    "tier": "admin",
    "actions": [
      {
        "id": "PATCH /people/{id}/activate",
        "name": "activate",
        "method": "PATCH",
        "path": "/people/{id}/activate",
        "summary": "Activate a person",
        "requiresId": true,
        "tier": "admin"
      },
      {
        "id": "PATCH /people/{id}/archive",
        "name": "archive",
        "method": "PATCH",
        "path": "/people/{id}/archive",
        "summary": "Archive a person",
        "requiresId": true,
        "tier": "admin"
      },
      {
        "id": "PATCH /people/merge",
        "name": "bulk_merge",
        "method": "PATCH",
        "path": "/people/merge",
        "summary": "Merge a person",
        "requiresId": false,
        "collectionWide": true,
        "tier": "admin"
      },
      {
        "id": "PATCH /people/{id}/deactivate",
        "name": "deactivate",
        "method": "PATCH",
        "path": "/people/{id}/deactivate",
        "summary": "Deactivate a person",
        "requiresId": true,
        "tier": "admin"
      },
      {
        "id": "PATCH /people/{id}/invite",
        "name": "invite",
        "method": "PATCH",
        "path": "/people/{id}/invite",
        "summary": "Invite a person",
        "requiresId": true,
        "tier": "admin",
        "outward": true
      },
      {
        "id": "PATCH /people/{id}/regenerate_recovery_codes",
        "name": "regenerate_recovery_codes",
        "method": "PATCH",
        "path": "/people/{id}/regenerate_recovery_codes",
        "summary": "Regenerate 2FA recovery codes",
        "requiresId": true,
        "tier": "admin"
      },
      {
        "id": "PATCH /people/{id}/resend",
        "name": "resend",
        "method": "PATCH",
        "path": "/people/{id}/resend",
        "summary": "Resend email to a person",
        "requiresId": true,
        "tier": "admin",
        "outward": true
      },
      {
        "id": "PATCH /people/{id}/restore",
        "name": "restore",
        "method": "PATCH",
        "path": "/people/{id}/restore",
        "summary": "Restore a person",
        "requiresId": true,
        "tier": "admin"
      },
      {
        "id": "PATCH /people/{id}/virtualize",
        "name": "virtualize",
        "method": "PATCH",
        "path": "/people/{id}/virtualize",
        "summary": "Virtualize a person",
        "requiresId": true,
        "tier": "admin"
      }
    ],
    "list": {
      "filters": [
        "accessible_deal_id",
        "accessible_doc_id",
        "accessible_filter_id",
        "accessible_project_id",
        "agent",
        "approval_policy_id",
        "approval_workflow_id",
        "archived_at",
        "autotracking",
        "bookings_after",
        "bookings_before",
        "company_id",
        "created_at",
        "custom_fields",
        "custom_role_id",
        "deactivated_at",
        "eligible_replacement_managers",
        "email",
        "first_name",
        "full_query",
        "fuzzy_dates",
        "fuzzy_people",
        "holiday_calendar_id",
        "hrm_type_id",
        "id",
        "job_role_id",
        "joined_at",
        "jump_query",
        "last_activity_at",
        "last_name",
        "last_seen_at",
        "manager_id",
        "offboarding_status",
        "permissions",
        "person_type",
        "project_id",
        "project_watching",
        "query",
        "role_id",
        "schedulable",
        "service_id",
        "service_type_id",
        "shared_seat",
        "status",
        "subscribable_id",
        "subscribable_type",
        "subsidiary_id",
        "tags",
        "team",
        "time_tracking_policy_id",
        "timesheet_submission_disabled",
        "title",
        "two_factor_auth",
        "virtual"
      ],
      "sorts": [
        "autotracking",
        "company_name",
        "custom_fields",
        "custom_role",
        "email",
        "job_role",
        "joined_at",
        "last_seen_at",
        "manager",
        "name",
        "resource_request_match",
        "role_id",
        "schedulable",
        "subsidiary",
        "title",
        "two_factor_auth"
      ],
      "relationships": [
        "approval_policy_assignment",
        "company",
        "custom_field_attachments",
        "custom_field_people",
        "custom_role",
        "import",
        "job_role",
        "manager",
        "organization",
        "service_types",
        "subsidiary",
        "teams",
        "time_tracking_policy"
      ]
    },
    "create": {
      "required": [
        "company_id",
        "role_id"
      ],
      "attributes": [
        "account_id",
        "ai_assistant_instructions",
        "autotracking",
        "avatar_url",
        "company_id",
        "contact",
        "custom_fields",
        "custom_role_id",
        "email",
        "first_name",
        "granular_notification_preferences",
        "job_role_id",
        "last_name",
        "manager_id",
        "nickname",
        "role_id",
        "status_emoji",
        "status_expires_at",
        "status_text",
        "subscriber_ids",
        "subsidiary_id",
        "tag_list",
        "time_off_status_sync",
        "time_tracking_policy_id",
        "time_unlocked",
        "time_unlocked_end_date",
        "time_unlocked_interval",
        "time_unlocked_on",
        "time_unlocked_period_id",
        "time_unlocked_start_date",
        "timesheet_submission_disabled",
        "title",
        "virtual"
      ],
      "relationships": []
    },
    "get": {
      "relationships": [
        "approval_policy_assignment",
        "company",
        "custom_field_attachments",
        "custom_field_people",
        "custom_role",
        "import",
        "job_role",
        "manager",
        "organization",
        "service_types",
        "subsidiary",
        "teams",
        "time_tracking_policy"
      ]
    },
    "update": {
      "required": [
        "company_id",
        "role_id"
      ],
      "attributes": [
        "account_id",
        "ai_assistant_instructions",
        "autotracking",
        "avatar_url",
        "company_id",
        "contact",
        "custom_fields",
        "custom_role_id",
        "email",
        "first_name",
        "granular_notification_preferences",
        "job_role_id",
        "last_name",
        "manager_id",
        "nickname",
        "role_id",
        "status_emoji",
        "status_expires_at",
        "status_text",
        "subscriber_ids",
        "subsidiary_id",
        "tag_list",
        "time_off_status_sync",
        "time_tracking_policy_id",
        "time_unlocked",
        "time_unlocked_end_date",
        "time_unlocked_interval",
        "time_unlocked_on",
        "time_unlocked_period_id",
        "time_unlocked_start_date",
        "timesheet_submission_disabled",
        "title",
        "virtual"
      ],
      "relationships": []
    }
  },
  "pipelines": {
    "key": "pipelines",
    "path": "/pipelines",
    "tag": "Pipelines",
    "tier": "write",
    "actions": [],
    "list": {
      "filters": [
        "pipeline_type_id"
      ],
      "sorts": [],
      "relationships": [
        "creator",
        "organization",
        "updater"
      ]
    },
    "create": {
      "required": [
        "name"
      ],
      "attributes": [
        "icon_id",
        "name",
        "pipeline_type_id",
        "position"
      ],
      "relationships": []
    },
    "get": {
      "relationships": [
        "creator",
        "organization",
        "updater"
      ]
    },
    "update": {
      "required": [
        "name"
      ],
      "attributes": [
        "icon_id",
        "name",
        "pipeline_type_id",
        "position"
      ],
      "relationships": []
    },
    "remove": true
  },
  "placeholder_usages": {
    "key": "placeholder_usages",
    "path": "/placeholder_usages",
    "tag": "Placeholder Usages",
    "tier": "write",
    "actions": [],
    "list": {
      "filters": [
        "field",
        "interval_enabled",
        "placeholder_id",
        "project_id",
        "skip_weekends",
        "target_id",
        "target_type",
        "task_id",
        "todo_id"
      ],
      "sorts": [
        "created_at",
        "field",
        "id",
        "interval_direction",
        "interval_enabled",
        "interval_unit",
        "interval_value",
        "placeholder_id",
        "skip_weekends",
        "target_id",
        "target_type",
        "updated_at"
      ],
      "relationships": [
        "placeholder",
        "task",
        "todo"
      ]
    },
    "get": {
      "relationships": [
        "placeholder",
        "task",
        "todo"
      ]
    },
    "remove": true
  },
  "placeholders": {
    "key": "placeholders",
    "path": "/placeholders",
    "tag": "Placeholders",
    "tier": "write",
    "actions": [],
    "list": {
      "filters": [
        "category",
        "created_at",
        "id",
        "name",
        "project_id",
        "query",
        "type",
        "usage_project_id"
      ],
      "sorts": [
        "category",
        "id",
        "name",
        "type"
      ],
      "relationships": [
        "organization",
        "project"
      ]
    },
    "create": {
      "required": [],
      "attributes": [
        "category",
        "color",
        "icon",
        "name",
        "project_id",
        "type"
      ],
      "relationships": []
    },
    "get": {
      "relationships": [
        "organization",
        "project"
      ]
    },
    "update": {
      "required": [],
      "attributes": [
        "category",
        "color",
        "icon",
        "name",
        "project_id",
        "type"
      ],
      "relationships": []
    },
    "remove": true
  },
  "prices": {
    "key": "prices",
    "path": "/prices",
    "tag": "Prices",
    "tier": "financial",
    "actions": [],
    "list": {
      "filters": [
        "billing_type_id",
        "booking_tracking_enabled",
        "company_id",
        "custom_fields",
        "expense_tracking_enabled",
        "id",
        "query",
        "rate_card_id",
        "rate_card_status",
        "service_type_id",
        "time_tracking_enabled",
        "unit_id"
      ],
      "sorts": [
        "billing_type_id",
        "booking_tracking_enabled",
        "custom_fields",
        "description",
        "discount",
        "estimated_cost",
        "expense_tracking_enabled",
        "markup",
        "name",
        "quantity",
        "rate",
        "service_type",
        "time_tracking_enabled",
        "unit_id"
      ],
      "relationships": [
        "company",
        "custom_field_attachments",
        "custom_field_people",
        "organization",
        "rate_card",
        "service_type",
        "updater"
      ]
    },
    "create": {
      "required": [
        "company_id",
        "currency",
        "name",
        "rate",
        "rate_card_id",
        "unit_id"
      ],
      "attributes": [
        "billing_type_id",
        "booking_tracking_enabled",
        "budget_cap_enabled",
        "company_id",
        "currency",
        "custom_fields",
        "discount",
        "editor_config",
        "estimated_cost",
        "estimated_hours",
        "expense_tracking_enabled",
        "markup",
        "name",
        "quantity",
        "rate",
        "rate_card_id",
        "service_type_id",
        "time_tracking_enabled",
        "unit_id"
      ],
      "relationships": []
    },
    "get": {
      "relationships": [
        "company",
        "custom_field_attachments",
        "custom_field_people",
        "organization",
        "rate_card",
        "service_type",
        "updater"
      ]
    },
    "update": {
      "required": [
        "company_id",
        "currency",
        "name",
        "rate",
        "rate_card_id",
        "unit_id"
      ],
      "attributes": [
        "billing_type_id",
        "booking_tracking_enabled",
        "budget_cap_enabled",
        "company_id",
        "currency",
        "custom_fields",
        "discount",
        "editor_config",
        "estimated_cost",
        "estimated_hours",
        "expense_tracking_enabled",
        "markup",
        "name",
        "quantity",
        "rate",
        "rate_card_id",
        "service_type_id",
        "time_tracking_enabled",
        "unit_id"
      ],
      "relationships": []
    },
    "remove": true
  },
  "project_assignments": {
    "key": "project_assignments",
    "path": "/project_assignments",
    "tag": "Project Assignments",
    "tier": "write",
    "actions": [],
    "list": {
      "filters": [
        "id",
        "person_id",
        "project_id"
      ],
      "sorts": [],
      "relationships": [
        "budgets_favorite_filter",
        "deals_favorite_filter",
        "docs_favorite_filter",
        "favorite_filter",
        "invoices_favorite_filter",
        "organization",
        "person",
        "project"
      ]
    },
    "create": {
      "required": [],
      "attributes": [
        "budgets_filter_id",
        "deals_filter_id",
        "default_filter_id",
        "docs_filter_id",
        "invoices_filter_id",
        "person_id",
        "preferences",
        "project_id",
        "subscribe",
        "tasks_layout_id",
        "unsubscribe",
        "watched"
      ],
      "relationships": []
    },
    "get": {
      "relationships": [
        "budgets_favorite_filter",
        "deals_favorite_filter",
        "docs_favorite_filter",
        "favorite_filter",
        "invoices_favorite_filter",
        "organization",
        "person",
        "project"
      ]
    },
    "update": {
      "required": [],
      "attributes": [
        "budgets_filter_id",
        "deals_filter_id",
        "default_filter_id",
        "docs_filter_id",
        "invoices_filter_id",
        "person_id",
        "preferences",
        "project_id",
        "subscribe",
        "tasks_layout_id",
        "unsubscribe",
        "watched"
      ],
      "relationships": []
    },
    "remove": true
  },
  "projects": {
    "key": "projects",
    "path": "/projects",
    "tag": "Projects",
    "tier": "write",
    "actions": [
      {
        "id": "PATCH /projects/{id}/apply_navigation_tabs",
        "name": "apply_navigation_tabs",
        "method": "PATCH",
        "path": "/projects/{id}/apply_navigation_tabs",
        "summary": "Applies navigation tabs from a template to the project",
        "requiresId": true,
        "tier": "write",
        "body": {
          "required": [
            "keep_existing_tabs",
            "template_id"
          ],
          "attributes": [
            "keep_existing_tabs",
            "template_id"
          ],
          "relationships": []
        }
      },
      {
        "id": "PATCH /projects/{id}/archive",
        "name": "archive",
        "method": "PATCH",
        "path": "/projects/{id}/archive",
        "summary": "Archives a project",
        "requiresId": true,
        "tier": "write"
      },
      {
        "id": "PATCH /projects/{id}/change_workflow",
        "name": "change_workflow",
        "method": "PATCH",
        "path": "/projects/{id}/change_workflow",
        "summary": "Changes workflow on project",
        "requiresId": true,
        "tier": "write",
        "body": {
          "required": [
            "map",
            "workflow_id"
          ],
          "attributes": [
            "map",
            "workflow_id"
          ],
          "relationships": []
        }
      },
      {
        "id": "POST /projects/copy",
        "name": "copy",
        "method": "POST",
        "path": "/projects/copy",
        "summary": "Copies a project",
        "requiresId": false,
        "tier": "write",
        "body": {
          "required": [
            "name",
            "project_type_id",
            "template_id"
          ],
          "attributes": [
            "company_id",
            "copy_as_template",
            "description",
            "name",
            "project_color_id",
            "project_manager_id",
            "project_type_id",
            "template_id"
          ],
          "relationships": []
        }
      },
      {
        "id": "PATCH /projects/{id}/restore",
        "name": "restore",
        "method": "PATCH",
        "path": "/projects/{id}/restore",
        "summary": "Restores a project",
        "requiresId": true,
        "tier": "write"
      },
      {
        "id": "PATCH /projects/{id}/subscribe",
        "name": "subscribe",
        "method": "PATCH",
        "path": "/projects/{id}/subscribe",
        "summary": "Subscribes to project",
        "requiresId": true,
        "tier": "write"
      },
      {
        "id": "PATCH /projects/{id}/unsubscribe",
        "name": "unsubscribe",
        "method": "PATCH",
        "path": "/projects/{id}/unsubscribe",
        "summary": "Unsubscribes from project",
        "requiresId": true,
        "tier": "write"
      }
    ],
    "list": {
      "filters": [
        "budget_id",
        "company_id",
        "cost",
        "created_at",
        "custom_fields",
        "estimated_time",
        "for_tracking",
        "full_query",
        "fuzzy_dates",
        "fuzzy_people",
        "id",
        "jump_query",
        "name",
        "number",
        "parent_company_id",
        "pending_invoicing",
        "person_id",
        "profit",
        "profit_margin",
        "project_color",
        "project_id",
        "project_number",
        "project_type",
        "query",
        "responsible_id",
        "revenue",
        "status",
        "template",
        "total_worked_time",
        "with_templates",
        "worked_time",
        "workflow_id"
      ],
      "sorts": [
        "company_name",
        "created_at",
        "custom_fields",
        "last_activity_at",
        "name",
        "number",
        "project_number"
      ],
      "relationships": [
        "company",
        "custom_field_attachments",
        "custom_field_people",
        "import",
        "last_actor",
        "organization",
        "project_manager",
        "template_object",
        "workflow"
      ]
    },
    "create": {
      "required": [
        "name",
        "project_manager_id",
        "project_type_id"
      ],
      "attributes": [
        "company_id",
        "custom_fields",
        "name",
        "page_custom_fields_ids",
        "page_custom_fields_positions",
        "preferences",
        "project_color_id",
        "project_manager_id",
        "project_type_id",
        "tag_colors",
        "task_custom_fields_ids",
        "task_custom_fields_positions",
        "workflow_id"
      ],
      "relationships": []
    },
    "get": {
      "relationships": [
        "company",
        "custom_field_attachments",
        "custom_field_people",
        "import",
        "last_actor",
        "organization",
        "project_manager",
        "template_object",
        "workflow"
      ]
    },
    "update": {
      "required": [
        "name",
        "project_manager_id",
        "project_type_id"
      ],
      "attributes": [
        "company_id",
        "custom_fields",
        "name",
        "page_custom_fields_ids",
        "page_custom_fields_positions",
        "preferences",
        "project_color_id",
        "project_manager_id",
        "project_type_id",
        "tag_colors",
        "task_custom_fields_ids",
        "task_custom_fields_positions",
        "workflow_id"
      ],
      "relationships": []
    },
    "remove": true
  },
  "proposals": {
    "key": "proposals",
    "path": "/proposals",
    "tag": "Proposals",
    "tier": "financial",
    "actions": [
      {
        "id": "PATCH /proposals/{id}/sync",
        "name": "sync",
        "method": "PATCH",
        "path": "/proposals/{id}/sync",
        "summary": "Sync a proposal",
        "requiresId": true,
        "tier": "financial"
      },
      {
        "id": "GET /proposals/{id}/sync_status",
        "name": "sync_status",
        "method": "GET",
        "path": "/proposals/{id}/sync_status",
        "summary": "Get proposal's sync status",
        "requiresId": true,
        "tier": "financial"
      }
    ],
    "list": {
      "filters": [
        "budget_total",
        "company_id",
        "created_at",
        "creator_id",
        "deal_id",
        "id",
        "link_status",
        "responsible_id",
        "sent_at",
        "status",
        "status_changed_at",
        "updated_at"
      ],
      "sorts": [],
      "relationships": [
        "client",
        "contact",
        "creator",
        "deal",
        "deal_creator",
        "document_type",
        "organization",
        "project",
        "proposal_from",
        "proposal_to",
        "responsible",
        "subsidiary",
        "tax_rate"
      ]
    },
    "get": {
      "relationships": [
        "client",
        "contact",
        "creator",
        "deal",
        "deal_creator",
        "document_type",
        "organization",
        "project",
        "proposal_from",
        "proposal_to",
        "responsible",
        "subsidiary",
        "tax_rate"
      ]
    },
    "remove": true
  },
  "pulses": {
    "key": "pulses",
    "path": "/pulses",
    "tag": "Pulses",
    "tier": "write",
    "actions": [
      {
        "id": "PATCH /pulses/{id}/send",
        "name": "send",
        "method": "PATCH",
        "path": "/pulses/{id}/send",
        "summary": "Send a pulse",
        "requiresId": true,
        "tier": "write"
      }
    ],
    "list": {
      "filters": [
        "creator_id",
        "filter_id",
        "id",
        "subscriber_id"
      ],
      "sorts": [],
      "relationships": [
        "creator",
        "filter",
        "memberships",
        "organization"
      ]
    },
    "create": {
      "required": [],
      "attributes": [
        "document_format_id",
        "export_params",
        "filter_id",
        "recipients",
        "repeat_schedule_id",
        "schedule_day_id",
        "schedule_frame_id",
        "schedule_hour",
        "skip_if_empty",
        "slack_channel",
        "teams_channel",
        "teams_team",
        "test_pulse",
        "type_id",
        "version"
      ],
      "relationships": []
    },
    "get": {
      "relationships": [
        "creator",
        "filter",
        "memberships",
        "organization"
      ]
    },
    "update": {
      "required": [],
      "attributes": [
        "document_format_id",
        "export_params",
        "filter_id",
        "recipients",
        "repeat_schedule_id",
        "schedule_day_id",
        "schedule_frame_id",
        "schedule_hour",
        "skip_if_empty",
        "slack_channel",
        "teams_channel",
        "teams_team",
        "test_pulse",
        "type_id",
        "version"
      ],
      "relationships": []
    },
    "remove": true
  },
  "purchase_orders": {
    "key": "purchase_orders",
    "path": "/purchase_orders",
    "tag": "Purchase Orders",
    "tier": "financial",
    "actions": [
      {
        "id": "DELETE /purchase_orders",
        "name": "bulk_delete",
        "method": "DELETE",
        "path": "/purchase_orders",
        "summary": "Delete purchase orders",
        "requiresId": false,
        "collectionWide": true,
        "tier": "financial"
      },
      {
        "id": "PATCH /purchase_orders",
        "name": "bulk_update",
        "method": "PATCH",
        "path": "/purchase_orders",
        "summary": "Update purchase orders",
        "requiresId": false,
        "collectionWide": true,
        "tier": "financial"
      },
      {
        "id": "POST /purchase_orders/copy",
        "name": "copy",
        "method": "POST",
        "path": "/purchase_orders/copy",
        "summary": "Copies a purchase order",
        "requiresId": false,
        "tier": "financial",
        "body": {
          "required": [
            "deal_id",
            "template_id"
          ],
          "attributes": [
            "deal_id",
            "template_id"
          ],
          "relationships": []
        }
      },
      {
        "id": "PATCH /purchase_orders/{id}/export",
        "name": "export",
        "method": "PATCH",
        "path": "/purchase_orders/{id}/export",
        "summary": "Exports a purchase order",
        "requiresId": true,
        "tier": "financial",
        "body": {
          "required": [],
          "attributes": [
            "company_reference_id",
            "xero_status_id"
          ],
          "relationships": []
        }
      },
      {
        "id": "PATCH /purchase_orders/{id}/export_update",
        "name": "export_update",
        "method": "PATCH",
        "path": "/purchase_orders/{id}/export_update",
        "summary": "Updates exported purchase order",
        "requiresId": true,
        "tier": "financial",
        "body": {
          "required": [],
          "attributes": [
            "company_reference_id",
            "xero_status_id"
          ],
          "relationships": []
        }
      },
      {
        "id": "PATCH /purchase_orders/{id}/send",
        "name": "send",
        "method": "PATCH",
        "path": "/purchase_orders/{id}/send",
        "summary": "Sends a purchase order",
        "requiresId": true,
        "tier": "financial",
        "body": {
          "required": [
            "body",
            "subject",
            "to"
          ],
          "attributes": [
            "attachment_ids",
            "bcc",
            "body",
            "cc",
            "from",
            "subject",
            "to"
          ],
          "relationships": []
        }
      }
    ],
    "list": {
      "filters": [
        "created_at",
        "creator_id",
        "deal_id",
        "delivery_on",
        "id",
        "issued_on",
        "number",
        "payment_status_id",
        "project_id",
        "query",
        "received_on",
        "sent_on",
        "sent_status",
        "status_id",
        "total_cost",
        "total_cost_with_tax",
        "total_received",
        "vendor_id"
      ],
      "sorts": [
        "created_at",
        "deal_id",
        "deal_name",
        "delivery_on",
        "id",
        "issued_on",
        "number",
        "payment_status_id",
        "received_on",
        "sent_on",
        "status_id",
        "total_cost",
        "total_cost_with_tax",
        "total_received",
        "vendor_id"
      ],
      "relationships": [
        "attachment",
        "bill_from",
        "bill_to",
        "creator",
        "deal",
        "document_type",
        "organization",
        "vendor"
      ]
    },
    "create": {
      "required": [
        "currency",
        "issued_on"
      ],
      "attributes": [
        "attachment_id",
        "currency",
        "deal_id",
        "delivery_on",
        "document_type_id",
        "issued_on",
        "note",
        "sent_on",
        "status_id",
        "subject",
        "subscriber_ids",
        "vendor_id"
      ],
      "relationships": []
    },
    "get": {
      "relationships": [
        "attachment",
        "bill_from",
        "bill_to",
        "creator",
        "deal",
        "document_type",
        "organization",
        "vendor"
      ]
    },
    "update": {
      "required": [
        "currency",
        "issued_on"
      ],
      "attributes": [
        "attachment_id",
        "currency",
        "deal_id",
        "delivery_on",
        "document_type_id",
        "issued_on",
        "note",
        "sent_on",
        "status_id",
        "subject",
        "subscriber_ids",
        "vendor_id"
      ],
      "relationships": []
    },
    "remove": true
  },
  "rate_cards": {
    "key": "rate_cards",
    "path": "/rate_cards",
    "tag": "Rate cards",
    "tier": "financial",
    "actions": [
      {
        "id": "PATCH /rate_cards/{id}/archive",
        "name": "archive",
        "method": "PATCH",
        "path": "/rate_cards/{id}/archive",
        "summary": "Archives a rate card",
        "requiresId": true,
        "tier": "financial"
      },
      {
        "id": "POST /rate_cards/copy",
        "name": "copy",
        "method": "POST",
        "path": "/rate_cards/copy",
        "summary": "Copy a rate card",
        "requiresId": false,
        "tier": "financial"
      },
      {
        "id": "PATCH /rate_cards/{id}/restore",
        "name": "restore",
        "method": "PATCH",
        "path": "/rate_cards/{id}/restore",
        "summary": "Restores a rate card",
        "requiresId": true,
        "tier": "financial"
      }
    ],
    "list": {
      "filters": [
        "company_id",
        "created_at",
        "name",
        "status"
      ],
      "sorts": [
        "created_at",
        "name"
      ],
      "relationships": [
        "company",
        "creator",
        "organization"
      ]
    },
    "create": {
      "required": [
        "company_id",
        "name"
      ],
      "attributes": [
        "company_id",
        "name"
      ],
      "relationships": []
    },
    "get": {
      "relationships": [
        "company",
        "creator",
        "organization"
      ]
    },
    "update": {
      "required": [
        "company_id",
        "name"
      ],
      "attributes": [
        "company_id",
        "name"
      ],
      "relationships": []
    },
    "remove": true
  },
  "report_categories": {
    "key": "report_categories",
    "path": "/report_categories",
    "tag": "Report Category",
    "tier": "write",
    "actions": [],
    "list": {
      "filters": [],
      "sorts": [],
      "relationships": [
        "organization"
      ]
    },
    "create": {
      "required": [
        "name"
      ],
      "attributes": [
        "color_id",
        "name",
        "position"
      ],
      "relationships": []
    },
    "get": {
      "relationships": [
        "organization"
      ]
    },
    "update": {
      "required": [
        "name"
      ],
      "attributes": [
        "color_id",
        "name",
        "position"
      ],
      "relationships": []
    },
    "remove": true
  },
  "reports/automation_reports": {
    "key": "reports/automation_reports",
    "path": "/reports/automation_reports",
    "tag": "Reports",
    "tier": "write",
    "actions": [],
    "list": {
      "filters": [
        "agent_id",
        "automatable_type",
        "created_at",
        "creator_id",
        "enabled",
        "exclude_template_projects",
        "id",
        "name",
        "project_id",
        "query",
        "resolve_on_all_projects",
        "survey_id",
        "target_id",
        "type_id",
        "updated_at"
      ],
      "sorts": [
        "automation_created_at",
        "automation_updated_at",
        "count",
        "created_at",
        "creator",
        "description",
        "enabled",
        "name",
        "project",
        "target_id",
        "type_id",
        "updated_at"
      ],
      "groups": [
        "automation",
        "created_at",
        "creator",
        "enabled",
        "organization",
        "project",
        "target",
        "type",
        "updated_at"
      ],
      "relationships": [
        "automation",
        "creator",
        "organization",
        "project",
        "projects",
        "report"
      ]
    }
  },
  "reports/booking_reports": {
    "key": "reports/booking_reports",
    "path": "/reports/booking_reports",
    "tag": "Reports",
    "tier": "write",
    "actions": [],
    "list": {
      "filters": [
        "absence_type",
        "after",
        "approval_status",
        "approved_at",
        "approver_id",
        "autotracking",
        "before",
        "billing_type_id",
        "booking_type",
        "budget_id",
        "canceled_at",
        "company_id",
        "created_at",
        "custom_fields",
        "date",
        "date_after",
        "date_before",
        "draft",
        "ended_on",
        "ended_on_after",
        "ended_on_before",
        "event_id",
        "formulas",
        "note",
        "parent_company_id",
        "people_custom_fields",
        "person_id",
        "person_subsidiary_id",
        "project_id",
        "project_type",
        "rejected_at",
        "service_id",
        "service_type_id",
        "stage_type",
        "started_on",
        "started_on_after",
        "started_on_before",
        "tags",
        "task_id",
        "time",
        "with_draft"
      ],
      "sorts": [
        "absence_type",
        "approval_status",
        "approved_at",
        "autotracking",
        "average_blended_rate",
        "average_recognized_margin",
        "billing_type",
        "booking",
        "booking_approved_at",
        "booking_canceled_at",
        "booking_created_at",
        "booking_ended_on",
        "booking_rejected_at",
        "booking_started_on",
        "budget",
        "canceled_at",
        "company",
        "count",
        "created_at",
        "custom_fields",
        "date",
        "deal",
        "draft",
        "event",
        "mandays",
        "people_custom_fields",
        "person",
        "project",
        "project_type",
        "rejected_at",
        "responsible",
        "service",
        "service_type",
        "stage_type",
        "task",
        "time",
        "total_base_cost",
        "total_cost",
        "total_recognized_profit",
        "total_recognized_revenue",
        "total_recognized_time"
      ],
      "groups": [
        "absence_type",
        "approval_status",
        "approved_at",
        "autotracking",
        "billing_type",
        "booking",
        "budget",
        "canceled_at",
        "company",
        "created_at",
        "custom_fields",
        "date",
        "draft",
        "event",
        "organization",
        "people_custom_fields",
        "person",
        "project",
        "project_type",
        "rejected_at",
        "responsible",
        "service",
        "service_type",
        "stage_type",
        "task"
      ],
      "relationships": [
        "booking",
        "budget",
        "company",
        "company_report",
        "deal_or_budget_report",
        "event",
        "organization",
        "person",
        "person_report",
        "project",
        "project_report",
        "report",
        "responsible_report",
        "service",
        "service_report",
        "service_type",
        "task",
        "task_report"
      ]
    }
  },
  "reports/budget_reports": {
    "key": "reports/budget_reports",
    "path": "/reports/budget_reports",
    "tag": "Reports",
    "tier": "write",
    "actions": [],
    "list": {
      "filters": [
        "accessible_by_person",
        "actual_rate",
        "approval_policy_id",
        "billable_time",
        "budget_remaining",
        "budget_status",
        "budget_total",
        "budget_usage",
        "budget_used",
        "budget_warning",
        "budgeted_time",
        "closed_at",
        "color_id",
        "company_id",
        "contact_id",
        "contract_id",
        "cost",
        "created_at",
        "creator_id",
        "credited",
        "currency",
        "custom_fields",
        "date",
        "days_in_current_stage",
        "days_since_created",
        "days_since_last_activity",
        "deal_status_id",
        "deal_type_id",
        "delivered_on",
        "designated_approver_id",
        "discount",
        "draft_invoiced",
        "end_date",
        "estimated_cost",
        "estimated_remaining_time",
        "estimated_time",
        "expense",
        "expenses_billable",
        "forecasted_billable_time",
        "forecasted_budget_usage",
        "forecasted_budget_used",
        "forecasted_cost",
        "forecasted_margin",
        "forecasted_profit",
        "forecasted_revenue",
        "forecasted_time_usage",
        "formulas",
        "full_query",
        "future_booked_time",
        "future_budget_used",
        "future_cost",
        "future_revenue",
        "fuzzy_dates",
        "fuzzy_people",
        "id",
        "invoiced",
        "invoiced_percentage",
        "invoiced_rate",
        "jump_query",
        "last_activity_at",
        "lost_at",
        "lost_date",
        "lost_reason_id",
        "manual_invoicing_status",
        "manually_invoiced",
        "name",
        "needs_closing",
        "needs_invoicing",
        "next_occurrence_on",
        "number",
        "origin_deal_id",
        "parent_company_id",
        "pending_invoicing",
        "pipeline_id",
        "previous_deal_status_id",
        "previous_or_current_deal_status_id",
        "previous_probability",
        "probability",
        "profit",
        "profit_margin",
        "project_id",
        "project_type",
        "projected_revenue",
        "purchase_order_number",
        "query",
        "recurring",
        "recurring_ends_on",
        "recurring_interval_id",
        "recurring_starts_on",
        "responsible_id",
        "retainer_interval",
        "revenue",
        "revenue_distribution_type",
        "sales_closed_at",
        "sales_closed_on",
        "sales_status_id",
        "services_revenue",
        "stage_status_id",
        "stage_updated_at",
        "status",
        "status_id",
        "subscriber_id",
        "subsidiary_id",
        "tags",
        "template",
        "time_approval",
        "todo_due_date",
        "tracking_type_id",
        "type",
        "unapproved_time",
        "won_at",
        "won_date",
        "work_cost",
        "worked_time"
      ],
      "sorts": [
        "average_actual_rate",
        "average_budget_usage",
        "average_forecasted_budget_overrun",
        "average_forecasted_budget_usage",
        "average_forecasted_time_usage",
        "average_invoiced_percentage",
        "average_invoiced_rate",
        "average_profit_margin",
        "budget",
        "budget_client_access",
        "budget_closed_at",
        "budget_created_at",
        "budget_custom_fields",
        "budget_date",
        "budget_delivered_on",
        "budget_end_date",
        "budget_last_activity_at",
        "budget_number",
        "budget_purchase_order_number",
        "budget_status",
        "budget_suffix",
        "budget_time_approval",
        "budget_warning_percentage",
        "closed_at",
        "company",
        "contract",
        "count",
        "created_at",
        "custom_fields",
        "date",
        "deal_type",
        "delivered_on",
        "designated_approver",
        "end_date",
        "last_activity_at",
        "month",
        "next_occurrence_on",
        "origin_deal",
        "project",
        "project_type",
        "quarter",
        "recurring",
        "recurring_ends_on",
        "recurring_interval",
        "recurring_starts_on",
        "responsible",
        "status",
        "subsidiary",
        "total_billable_time",
        "total_budget_remaining",
        "total_budget_total",
        "total_budget_used",
        "total_budgeted_time",
        "total_cost",
        "total_credited",
        "total_draft_invoiced",
        "total_estimated_cost",
        "total_estimated_remaining_time",
        "total_estimated_time",
        "total_expense",
        "total_expense_billable",
        "total_forecasted_billable_time",
        "total_forecasted_budget_overrun",
        "total_forecasted_budget_used",
        "total_forecasted_cost",
        "total_future_booked_time",
        "total_future_budget_used",
        "total_future_cost",
        "total_invoiced",
        "total_manually_invoiced",
        "total_pending_invoicing",
        "total_profit",
        "total_revenue",
        "total_services_revenue",
        "total_unapproved_time",
        "total_work_cost",
        "total_worked_time",
        "tracking_type_id",
        "week",
        "year"
      ],
      "groups": [
        "budget",
        "closed_at",
        "company",
        "contract",
        "created_at",
        "custom_fields",
        "date",
        "deal_type",
        "delivered_on",
        "designated_approver",
        "end_date",
        "last_activity_at",
        "month",
        "next_occurrence_on",
        "organization",
        "origin_deal",
        "primary_contact",
        "project",
        "project_type",
        "purchase_order_number",
        "quarter",
        "recurring",
        "recurring_ends_on",
        "recurring_interval",
        "recurring_starts_on",
        "responsible",
        "revenue_distribution_type",
        "status",
        "subsidiary",
        "tracking_type_id",
        "week",
        "year"
      ],
      "relationships": [
        "budget",
        "company",
        "company_report",
        "contract",
        "deal_status",
        "designated_approver",
        "organization",
        "origin_deal",
        "origin_deal_report",
        "owner_report",
        "pipeline",
        "primary_contact",
        "primary_contact_report",
        "project",
        "project_report",
        "report",
        "responsible",
        "subsidiary"
      ]
    }
  },
  "reports/company_reports": {
    "key": "reports/company_reports",
    "path": "/reports/company_reports",
    "tag": "Reports",
    "tier": "write",
    "actions": [],
    "list": {
      "filters": [
        "archived_at",
        "billing_name",
        "company_code",
        "company_id",
        "created_at",
        "custom_fields",
        "default_currency",
        "default_subsidiary_id",
        "default_tax_rate_id",
        "due_days",
        "exclude_company_and_children",
        "full_query",
        "fuzzy_dates",
        "fuzzy_people",
        "has_parent_company",
        "id",
        "jump_query",
        "last_activity_at",
        "name",
        "parent_company_id",
        "payment_terms",
        "project_id",
        "query",
        "status",
        "subscriber_id",
        "subsidiary_id",
        "tags",
        "vat"
      ],
      "sorts": [
        "company",
        "company_billing_name",
        "company_code",
        "company_created_at",
        "company_custom_fields",
        "company_last_activity_at",
        "company_name",
        "contact_address",
        "contact_city",
        "contact_country",
        "contact_email",
        "contact_phone",
        "contact_state",
        "contact_website",
        "contact_zipcode",
        "count",
        "created_at",
        "custom_fields",
        "last_activity_at",
        "month",
        "parent_company",
        "payment_terms",
        "quarter",
        "status",
        "subsidiary",
        "week",
        "year"
      ],
      "groups": [
        "company",
        "contact_address",
        "contact_city",
        "contact_country",
        "contact_email",
        "contact_phone",
        "contact_state",
        "contact_website",
        "contact_zipcode",
        "created_at",
        "custom_fields",
        "last_activity_at",
        "month",
        "organization",
        "parent_company",
        "quarter",
        "status",
        "subsidiary",
        "week",
        "year"
      ],
      "relationships": [
        "company",
        "organization",
        "parent_company",
        "parent_company_report",
        "report",
        "subsidiary"
      ]
    }
  },
  "reports/deal_funnel_reports": {
    "key": "reports/deal_funnel_reports",
    "path": "/reports/deal_funnel_reports",
    "tag": "Reports",
    "tier": "write",
    "actions": [],
    "list": {
      "filters": [
        "budget_total",
        "created_at",
        "date",
        "formulas",
        "pipeline_id",
        "projected_revenue"
      ],
      "sorts": [],
      "groups": [
        "deal_funnel",
        "deal_status",
        "organization",
        "pipeline"
      ],
      "relationships": [
        "deal_status",
        "organization",
        "pipeline",
        "report"
      ]
    }
  },
  "reports/deal_reports": {
    "key": "reports/deal_reports",
    "path": "/reports/deal_reports",
    "tag": "Reports",
    "tier": "write",
    "actions": [],
    "list": {
      "filters": [
        "accessible_by_person",
        "actual_rate",
        "approval_policy_id",
        "billable_time",
        "budget_remaining",
        "budget_status",
        "budget_total",
        "budget_usage",
        "budget_used",
        "budget_warning",
        "budgeted_time",
        "closed_at",
        "color_id",
        "company_id",
        "contact_id",
        "contract_id",
        "cost",
        "created_at",
        "creator_id",
        "credited",
        "currency",
        "custom_fields",
        "date",
        "days_in_current_stage",
        "days_since_created",
        "days_since_last_activity",
        "deal_status_id",
        "deal_type_id",
        "deal_value_source",
        "delivered_on",
        "designated_approver_id",
        "discount",
        "draft_invoiced",
        "end_date",
        "estimated_cost",
        "estimated_remaining_time",
        "estimated_time",
        "expense",
        "expenses_billable",
        "forecasted_billable_time",
        "forecasted_budget_usage",
        "forecasted_budget_used",
        "forecasted_cost",
        "forecasted_margin",
        "forecasted_profit",
        "forecasted_revenue",
        "forecasted_time_usage",
        "formulas",
        "full_query",
        "future_booked_time",
        "future_budget_used",
        "future_cost",
        "future_revenue",
        "fuzzy_dates",
        "fuzzy_people",
        "id",
        "invoiced",
        "invoiced_percentage",
        "invoiced_rate",
        "jump_query",
        "last_activity_at",
        "lost_at",
        "lost_date",
        "lost_reason_id",
        "manual_invoicing_status",
        "manually_invoiced",
        "name",
        "needs_closing",
        "needs_invoicing",
        "next_occurrence_on",
        "number",
        "origin_deal_id",
        "parent_company_id",
        "pending_invoicing",
        "pipeline_id",
        "previous_deal_status_id",
        "previous_or_current_deal_status_id",
        "previous_probability",
        "probability",
        "profit",
        "profit_margin",
        "project_id",
        "project_type",
        "projected_revenue",
        "purchase_order_number",
        "query",
        "recurring",
        "recurring_ends_on",
        "recurring_interval_id",
        "recurring_starts_on",
        "responsible_id",
        "retainer",
        "retainer_interval",
        "revenue",
        "revenue_distribution_type",
        "sales_closed_at",
        "sales_closed_on",
        "sales_status_id",
        "services_revenue",
        "stage_status_id",
        "stage_updated_at",
        "status",
        "status_id",
        "subscriber_id",
        "subsidiary_id",
        "tags",
        "template",
        "time_approval",
        "todo_due_date",
        "tracking_type_id",
        "type",
        "unapproved_time",
        "won_at",
        "won_date",
        "work_cost",
        "worked_time"
      ],
      "sorts": [
        "average_actual_rate",
        "average_rate",
        "average_retainer_interval_count",
        "budget_status",
        "company",
        "contact",
        "count",
        "created_at",
        "creator",
        "custom_fields",
        "date",
        "deal",
        "deal_average_days_in_current_stage",
        "deal_average_days_since_created",
        "deal_average_days_since_last_activity",
        "deal_budget_warning",
        "deal_client_access",
        "deal_closed_at",
        "deal_created_at",
        "deal_custom_fields",
        "deal_date",
        "deal_end_date",
        "deal_last_activity_at",
        "deal_lost_date",
        "deal_number",
        "deal_previous_probability",
        "deal_probability",
        "deal_purchase_order_number",
        "deal_retainer",
        "deal_retainer_interval",
        "deal_revenue_distribution_end_on",
        "deal_revenue_distribution_start_on",
        "deal_sales_closed_at",
        "deal_sales_closed_on",
        "deal_sales_status_updated_at",
        "deal_status",
        "deal_suffix",
        "deal_time_approval",
        "deal_todo_due_date",
        "deal_value_source",
        "deal_won_date",
        "designated_approver",
        "last_activity_at",
        "lost_reason",
        "month",
        "pipeline",
        "previous_deal_status",
        "project",
        "quarter",
        "responsible",
        "revenue_distribution_base",
        "revenue_distribution_end_on",
        "revenue_distribution_start_on",
        "sales_closed_at",
        "sales_closed_on",
        "sales_status_id",
        "stage_status_id",
        "stage_updated_at",
        "subsidiary",
        "total_billable_time",
        "total_budget_from_services",
        "total_budget_total",
        "total_budget_used",
        "total_budgeted_time",
        "total_cost",
        "total_estimated_cost",
        "total_estimated_remaining_time",
        "total_estimated_time",
        "total_expense",
        "total_profit",
        "total_projected_revenue",
        "total_revenue",
        "total_services_revenue",
        "total_work_cost",
        "total_worked_time",
        "tracking_type_id",
        "week",
        "year"
      ],
      "groups": [
        "company",
        "contact",
        "created_at",
        "creator",
        "custom_fields",
        "date",
        "deal",
        "deal_status",
        "deal_value_source",
        "designated_approver",
        "last_activity_at",
        "lost_reason",
        "month",
        "organization",
        "pipeline",
        "previous_deal_status",
        "primary_contact",
        "project",
        "quarter",
        "responsible",
        "revenue_distribution_base",
        "revenue_distribution_end_on",
        "revenue_distribution_start_on",
        "sales_closed_at",
        "sales_closed_on",
        "sales_status_id",
        "stage_status_id",
        "stage_updated_at",
        "subsidiary",
        "tracking_type_id",
        "week",
        "year"
      ],
      "relationships": [
        "company",
        "company_report",
        "contact",
        "contact_report",
        "creator",
        "creator_report",
        "deal",
        "deal_status",
        "designated_approver",
        "lost_reason",
        "organization",
        "owner_report",
        "pipeline",
        "previous_deal_status",
        "primary_contact",
        "primary_contact_report",
        "project",
        "project_report",
        "report",
        "responsible",
        "subsidiary"
      ]
    }
  },
  "reports/entitlement_reports": {
    "key": "reports/entitlement_reports",
    "path": "/reports/entitlement_reports",
    "tag": "Reports",
    "tier": "write",
    "actions": [],
    "list": {
      "filters": [
        "absence_type",
        "allocated",
        "date",
        "end_date",
        "event_id",
        "formulas",
        "id",
        "person_id",
        "start_date",
        "used"
      ],
      "sorts": [
        "absence_type",
        "count",
        "end_date",
        "entitlement",
        "entitlement_end_date",
        "entitlement_start_date",
        "event",
        "people_custom_fields",
        "person",
        "start_date",
        "subsidiary",
        "total_allocated",
        "total_allocated_minutes",
        "total_available",
        "total_available_minutes",
        "total_pending",
        "total_pending_minutes",
        "total_used",
        "total_used_minutes"
      ],
      "groups": [
        "absence_type",
        "end_date",
        "entitlement",
        "event",
        "organization",
        "people_custom_fields",
        "person",
        "start_date",
        "subsidiary"
      ],
      "relationships": [
        "entitlement",
        "event",
        "organization",
        "person",
        "person_report",
        "report",
        "subsidiary"
      ]
    }
  },
  "reports/expense_reports": {
    "key": "reports/expense_reports",
    "path": "/reports/expense_reports",
    "tag": "Reports",
    "tier": "write",
    "actions": [],
    "list": {
      "filters": [
        "allocation_status",
        "amount",
        "amount_with_tax",
        "approval_status",
        "approved_at",
        "approver_id",
        "assigned_approver_id",
        "awaiting_approval_from_approver_id",
        "billable_amount",
        "company_id",
        "created_at",
        "creator_id",
        "currency",
        "custom_fields",
        "date",
        "date_after",
        "date_before",
        "deal_id",
        "designated_approver_id",
        "draft",
        "export_status",
        "formulas",
        "full_query",
        "fuzzy_dates",
        "fuzzy_people",
        "id",
        "invoice_id",
        "invoiced",
        "invoicing_status",
        "jump_query",
        "name",
        "paid_on",
        "paid_on_after",
        "paid_on_before",
        "pay_on",
        "pay_on_after",
        "pay_on_before",
        "person_id",
        "profit",
        "project_id",
        "purchase_order_id",
        "quantity",
        "query",
        "quote_type",
        "recognized_revenue",
        "reimbursable",
        "reimbursed_on",
        "reimbursement",
        "responsible_id",
        "section_name",
        "service_id",
        "service_type_id",
        "stage_type",
        "status",
        "tax_rate_id",
        "updated_at",
        "updater_id",
        "vendor_id",
        "with_draft"
      ],
      "sorts": [
        "approval_status",
        "approved_at",
        "approver",
        "average_profit_margin",
        "company",
        "count",
        "created_at",
        "creator",
        "custom_fields",
        "date",
        "deal",
        "designated_approver",
        "expense",
        "expense_created_at",
        "expense_date",
        "expense_name",
        "expense_paid_on",
        "expense_pay_on",
        "expense_reimbursed_on",
        "invoiced",
        "invoicing_status",
        "month",
        "name",
        "paid_on",
        "pay_on",
        "person",
        "project",
        "project_id",
        "purchase_order",
        "quantity",
        "quarter",
        "quote_type",
        "reimbursed_on",
        "reimbursement",
        "responsible",
        "section_name",
        "service",
        "service_type",
        "stage_type",
        "status",
        "tax_rate_id",
        "total_amount",
        "total_amount_with_tax",
        "total_billable_amount",
        "total_profit",
        "total_recognized_revenue",
        "total_tax_amount",
        "updated_at",
        "updater",
        "vendor",
        "week",
        "year"
      ],
      "groups": [
        "approval_status",
        "approved_at",
        "approver",
        "company",
        "created_at",
        "creator",
        "custom_fields",
        "date",
        "deal",
        "designated_approver",
        "expense",
        "invoice",
        "invoiced",
        "invoicing_status",
        "month",
        "organization",
        "paid_on",
        "pay_on",
        "person",
        "project",
        "purchase_order",
        "quarter",
        "quote_type",
        "reimbursed_on",
        "reimbursement",
        "responsible",
        "section_name",
        "service",
        "service_type",
        "stage_type",
        "status",
        "tax_rate",
        "updated_at",
        "updater",
        "vendor",
        "week",
        "year"
      ],
      "relationships": [
        "approver",
        "company",
        "company_report",
        "creator",
        "deal",
        "deal_or_budget_report",
        "designated_approver",
        "expense",
        "invoice",
        "organization",
        "person",
        "person_report",
        "project",
        "project_report",
        "purchase_order",
        "report",
        "service",
        "service_type",
        "tax_rate",
        "updater",
        "vendor",
        "vendor_report"
      ]
    }
  },
  "reports/financial_item_reports": {
    "key": "reports/financial_item_reports",
    "path": "/reports/financial_item_reports",
    "tag": "Reports",
    "tier": "write",
    "actions": [],
    "list": {
      "filters": [
        "approval_status",
        "billing_type",
        "blended_rate",
        "budget_id",
        "budget_status",
        "budget_total",
        "budget_used",
        "company_id",
        "cost",
        "credited",
        "custom_fields",
        "date",
        "deal_status_id",
        "description",
        "draft_invoiced",
        "estimated_cost",
        "financial_item_type",
        "formulas",
        "future",
        "group",
        "invoiced",
        "locked",
        "origin_deal_id",
        "overhead_cost",
        "parent_company_id",
        "person_id",
        "pipeline_id",
        "probability",
        "profit",
        "project_id",
        "project_type_id",
        "responsible_id",
        "revenue",
        "scheduled_cost",
        "scheduled_revenue",
        "section_id",
        "service_id",
        "service_type_id",
        "stage_status",
        "stage_type",
        "subsidiary_id",
        "total_billable_scheduled_time",
        "total_billable_time",
        "total_billable_worked_time",
        "total_budgeted_time",
        "total_estimated_time",
        "total_recognized_time",
        "total_scheduled_time",
        "total_time",
        "total_worked_time",
        "unit"
      ],
      "sorts": [
        "approval_status",
        "average_blended_rate",
        "average_margin",
        "average_recognized_margin",
        "billing_type",
        "budget",
        "company",
        "company_billing_name",
        "count",
        "custom_fields",
        "date",
        "deal_status",
        "financial_item_date",
        "financial_item_description",
        "financial_item_type",
        "future",
        "origin_deal",
        "person",
        "project",
        "project_type_id",
        "responsible",
        "section",
        "service",
        "service_type",
        "stage_status",
        "stage_type",
        "subsidiary",
        "total_billable_scheduled_time",
        "total_billable_time",
        "total_billable_worked_time",
        "total_budget_total",
        "total_budget_used",
        "total_budgeted_time",
        "total_cost",
        "total_credited",
        "total_draft_invoiced",
        "total_estimated_cost",
        "total_estimated_time",
        "total_expense_cost",
        "total_invoiced",
        "total_overhead_cost",
        "total_projected_revenue",
        "total_recognized_profit",
        "total_recognized_revenue",
        "total_recognized_time",
        "total_scheduled_cost",
        "total_scheduled_revenue",
        "total_scheduled_time",
        "total_time",
        "total_time_entry_cost",
        "total_worked_time"
      ],
      "groups": [
        "approval_status",
        "billing_type",
        "budget",
        "company",
        "custom_fields",
        "date",
        "deal_status",
        "financial_item",
        "financial_item_type",
        "future",
        "organization",
        "origin_deal",
        "person",
        "project",
        "project_type",
        "responsible",
        "section",
        "service",
        "service_type",
        "stage_status",
        "stage_type",
        "subsidiary"
      ],
      "relationships": [
        "booking_item",
        "budget",
        "company",
        "company_report",
        "deal_or_budget_report",
        "deal_status",
        "expense",
        "invoice_attribution",
        "organization",
        "origin_deal",
        "origin_deal_report",
        "owner_report",
        "person",
        "person_report",
        "project",
        "project_report",
        "report",
        "responsible",
        "revenue_item",
        "section",
        "service",
        "service_report",
        "service_type",
        "subsidiary",
        "time_entry"
      ]
    }
  },
  "reports/invoice_reports": {
    "key": "reports/invoice_reports",
    "path": "/reports/invoice_reports",
    "tag": "Reports",
    "tier": "write",
    "actions": [],
    "list": {
      "filters": [
        "amount",
        "amount_credited",
        "amount_credited_with_tax",
        "amount_paid",
        "amount_tax",
        "amount_unpaid",
        "amount_with_tax",
        "amount_written_off",
        "automatically_created",
        "company_id",
        "created_at",
        "creator_id",
        "credited",
        "currency",
        "currency_id",
        "custom_fields",
        "deal_id",
        "delivery_on",
        "einvoice_status",
        "export_status",
        "fiscalization_status",
        "formulas",
        "full_query",
        "fuzzy_dates",
        "fuzzy_people",
        "id",
        "invoice_aging",
        "invoice_state",
        "invoice_status",
        "invoice_type",
        "invoiced_on",
        "invoicing_method",
        "issuer_id",
        "jump_query",
        "last_activity_at",
        "number",
        "overdue_status",
        "paid_on",
        "parent_company_id",
        "parent_invoice_id",
        "pay_on",
        "payment_status",
        "payment_terms",
        "project_id",
        "purchase_order_number",
        "query",
        "responsible_id",
        "sent_on",
        "sent_status",
        "status",
        "subscriber_id",
        "subsidiary_id",
        "tags",
        "tax_rates"
      ],
      "sorts": [
        "automatically_created",
        "average_due_in",
        "average_paid_in",
        "budget",
        "company",
        "company_billing_name",
        "count",
        "created_at",
        "creator",
        "currency",
        "custom_fields",
        "delivery_on",
        "einvoice_status",
        "fiscalization_status",
        "invoice",
        "invoice_aging",
        "invoice_created_at",
        "invoice_custom_fields",
        "invoice_delivery_on",
        "invoice_discount",
        "invoice_invoiced_on",
        "invoice_last_activity_at",
        "invoice_number",
        "invoice_paid_on",
        "invoice_pay_on",
        "invoice_purchase_order_number",
        "invoice_sent_on",
        "invoice_state",
        "invoice_status",
        "invoice_subject",
        "invoice_type",
        "invoiced_on",
        "issuer",
        "last_activity_at",
        "month",
        "overdue_status",
        "paid_on",
        "pay_on",
        "payment_status",
        "project",
        "quarter",
        "sent_on",
        "sent_status",
        "subsidiary",
        "tax_rates",
        "total_amount",
        "total_amount_credited",
        "total_amount_credited_with_tax",
        "total_amount_paid",
        "total_amount_tax",
        "total_amount_unpaid",
        "total_amount_with_tax",
        "total_amount_written_off",
        "week",
        "year"
      ],
      "groups": [
        "company",
        "created_at",
        "creator",
        "currency",
        "custom_fields",
        "delivery_on",
        "einvoice_status",
        "fiscalization_status",
        "invoice",
        "invoice_aging",
        "invoice_state",
        "invoice_status",
        "invoice_type",
        "invoiced_on",
        "issuer",
        "last_activity_at",
        "month",
        "organization",
        "overdue_status",
        "paid_on",
        "pay_on",
        "payment_status",
        "quarter",
        "sent_on",
        "sent_status",
        "subsidiary",
        "week",
        "year"
      ],
      "relationships": [
        "company",
        "company_report",
        "creator",
        "creator_report",
        "invoice",
        "issuer",
        "issuer_report",
        "organization",
        "report",
        "subsidiary"
      ]
    }
  },
  "reports/line_item_reports": {
    "key": "reports/line_item_reports",
    "path": "/reports/line_item_reports",
    "tag": "Reports",
    "tier": "write",
    "actions": [],
    "list": {
      "filters": [
        "company_id",
        "creator_id",
        "discount",
        "expense_id",
        "id",
        "invoice_id",
        "service_id",
        "service_type_id",
        "tax_name",
        "tax_rate",
        "tax_value",
        "unit_id",
        "updater_id"
      ],
      "sorts": [
        "budget",
        "company",
        "count",
        "creator",
        "expense",
        "invoice",
        "kpd_code",
        "service",
        "tax_rate",
        "total_amount",
        "total_amount_tax",
        "total_amount_with_tax",
        "unit_id",
        "unit_price",
        "updater"
      ],
      "groups": [
        "company",
        "creator",
        "expense",
        "invoice",
        "kpd_code",
        "line_item",
        "organization",
        "service",
        "service_type",
        "unit",
        "updater"
      ],
      "relationships": [
        "company",
        "creator",
        "expense",
        "invoice",
        "invoice_report",
        "kpd_code",
        "line_item",
        "organization",
        "report",
        "service",
        "service_type",
        "updater"
      ]
    }
  },
  "reports/page_reports": {
    "key": "reports/page_reports",
    "path": "/reports/page_reports",
    "tag": "Reports",
    "tier": "write",
    "actions": [],
    "list": {
      "filters": [
        "created_at",
        "creator_id",
        "custom_fields",
        "edited_at",
        "full_query",
        "fuzzy_dates",
        "fuzzy_people",
        "id",
        "jump_query",
        "last_activity_at",
        "parent_page_id",
        "person_type",
        "project_id",
        "project_status",
        "query",
        "root_page_id",
        "status",
        "subscriber_id",
        "template"
      ],
      "sorts": [
        "count",
        "created_at",
        "creator",
        "custom_fields",
        "edited_at",
        "page",
        "page_id",
        "page_last_activity_at",
        "project",
        "title",
        "updater"
      ],
      "groups": [
        "creator",
        "custom_fields",
        "organization",
        "page",
        "project",
        "updater"
      ],
      "relationships": [
        "creator",
        "organization",
        "page",
        "project",
        "report",
        "updater"
      ]
    }
  },
  "reports/payment_reports": {
    "key": "reports/payment_reports",
    "path": "/reports/payment_reports",
    "tag": "Reports",
    "tier": "write",
    "actions": [],
    "list": {
      "filters": [
        "amount",
        "budget_id",
        "company_id",
        "external_id",
        "formulas",
        "id",
        "invoice_id",
        "number",
        "paid_after",
        "paid_before",
        "paid_on",
        "project_id",
        "query",
        "subsidiary_id",
        "written_off_on"
      ],
      "sorts": [
        "company",
        "count",
        "date",
        "deal",
        "invoice",
        "month",
        "payment",
        "payment_date",
        "payment_external_id",
        "payment_note",
        "payment_paid_on",
        "payment_written_off_on",
        "project",
        "quarter",
        "subsidiary",
        "total_amount",
        "week",
        "year"
      ],
      "groups": [
        "company",
        "date",
        "invoice",
        "month",
        "organization",
        "payment",
        "quarter",
        "subsidiary",
        "week",
        "year"
      ],
      "relationships": [
        "company",
        "company_report",
        "deal",
        "invoice",
        "invoice_report",
        "organization",
        "payment",
        "report",
        "subsidiary"
      ]
    }
  },
  "reports/payroll_item_reports": {
    "key": "reports/payroll_item_reports",
    "path": "/reports/payroll_item_reports",
    "tag": "Reports",
    "tier": "write",
    "actions": [],
    "list": {
      "filters": [
        "booking_id",
        "company_id",
        "custom_fields",
        "date",
        "formulas",
        "group",
        "parent_company_id",
        "payroll_item_type",
        "person_id",
        "person_status",
        "person_type",
        "role_id",
        "salary_id",
        "salary_type_id",
        "subsidiary_id",
        "time_entry_id"
      ],
      "sorts": [
        "company_id",
        "count",
        "custom_fields",
        "date",
        "end_date",
        "payroll_item_id",
        "payroll_item_type",
        "person",
        "person_status",
        "person_type",
        "role_id",
        "salary_id",
        "salary_type_id",
        "start_date",
        "subsidiary_id",
        "total_availability",
        "total_capacity",
        "total_cost",
        "total_scheduled_time",
        "total_time",
        "total_time_off_cost",
        "total_time_off_time"
      ],
      "groups": [
        "booking",
        "company",
        "custom_fields",
        "date",
        "organization",
        "payroll_item",
        "payroll_item_type",
        "person",
        "person_status",
        "person_type",
        "role",
        "salary",
        "salary_type",
        "subsidiary",
        "time_entry"
      ],
      "relationships": [
        "booking",
        "company",
        "organization",
        "person",
        "person_report",
        "report",
        "salary",
        "subsidiary",
        "time_entry"
      ]
    }
  },
  "reports/person_reports": {
    "key": "reports/person_reports",
    "path": "/reports/person_reports",
    "tag": "Reports",
    "tier": "write",
    "actions": [],
    "list": {
      "filters": [
        "accessible_deal_id",
        "accessible_doc_id",
        "accessible_filter_id",
        "accessible_project_id",
        "agent",
        "approval_policy_id",
        "approval_workflow_id",
        "archived_at",
        "autotracking",
        "bookings_after",
        "bookings_before",
        "company_id",
        "created_at",
        "custom_fields",
        "custom_role_id",
        "deactivated_at",
        "eligible_replacement_managers",
        "email",
        "first_name",
        "full_query",
        "fuzzy_dates",
        "fuzzy_people",
        "holiday_calendar_id",
        "hrm_type_id",
        "id",
        "job_role_id",
        "joined_at",
        "jump_query",
        "last_activity_at",
        "last_name",
        "last_seen_at",
        "manager_id",
        "offboarding_status",
        "permissions",
        "person_type",
        "project_id",
        "project_watching",
        "query",
        "role_id",
        "schedulable",
        "service_id",
        "service_type_id",
        "shared_seat",
        "status",
        "subscribable_id",
        "subscribable_type",
        "subsidiary_id",
        "tags",
        "team",
        "time_tracking_policy_id",
        "timesheet_submission_disabled",
        "title",
        "two_factor_auth",
        "virtual"
      ],
      "sorts": [
        "approval_policy",
        "autotracking",
        "company",
        "contact_address",
        "contact_city",
        "contact_country",
        "contact_email",
        "contact_phone",
        "contact_state",
        "contact_website",
        "contact_zipcode",
        "count",
        "created_at",
        "custom_fields",
        "custom_role",
        "deactivated_at",
        "job_role",
        "joined_at",
        "last_activity_at",
        "manager",
        "month",
        "offboarding_status",
        "person",
        "person_active_teams",
        "person_created_at",
        "person_custom_fields",
        "person_deactivated_at",
        "person_email",
        "person_first_name",
        "person_joined_at",
        "person_last_activity_at",
        "person_last_name",
        "person_last_seen_at",
        "person_name",
        "person_role_id",
        "person_status",
        "person_title",
        "person_type",
        "quarter",
        "role_id",
        "shared_seat",
        "status",
        "subsidiary",
        "type",
        "week",
        "year"
      ],
      "groups": [
        "approval_policy",
        "autotracking",
        "company",
        "contact_address",
        "contact_city",
        "contact_country",
        "contact_email",
        "contact_phone",
        "contact_state",
        "contact_website",
        "contact_zipcode",
        "created_at",
        "custom_fields",
        "custom_role",
        "deactivated_at",
        "job_role",
        "joined_at",
        "last_activity_at",
        "manager",
        "month",
        "offboarding_status",
        "organization",
        "person",
        "quarter",
        "role_id",
        "shared_seat",
        "status",
        "subsidiary",
        "type",
        "week",
        "year"
      ],
      "relationships": [
        "approval_policy",
        "company",
        "company_report",
        "custom_role",
        "job_role",
        "manager",
        "manager_report",
        "organization",
        "person",
        "report",
        "subsidiary"
      ]
    }
  },
  "reports/price_reports": {
    "key": "reports/price_reports",
    "path": "/reports/price_reports",
    "tag": "Reports",
    "tier": "write",
    "actions": [],
    "list": {
      "filters": [
        "billing_type_id",
        "booking_tracking_enabled",
        "company_id",
        "custom_fields",
        "expense_tracking_enabled",
        "id",
        "rate_card_id",
        "rate_card_status",
        "service_type_id",
        "time_tracking_enabled",
        "unit_id"
      ],
      "sorts": [
        "average_discount",
        "average_discount_amount",
        "average_discounted_rate",
        "average_estimated_cost",
        "average_markup",
        "average_markup_amount",
        "average_rate",
        "booking_tracking_enabled",
        "company",
        "count",
        "expense_tracking_enabled",
        "price",
        "price_description",
        "price_name",
        "price_quantity",
        "rate_card",
        "rate_card_status",
        "service_type",
        "time_tracking_enabled"
      ],
      "groups": [
        "booking_tracking_enabled",
        "company",
        "currency",
        "expense_tracking_enabled",
        "organization",
        "price",
        "rate_card",
        "rate_card_status",
        "service_type",
        "time_tracking_enabled"
      ],
      "relationships": [
        "company",
        "company_report",
        "organization",
        "price",
        "rate_card",
        "report",
        "service_type"
      ]
    }
  },
  "reports/project_reports": {
    "key": "reports/project_reports",
    "path": "/reports/project_reports",
    "tag": "Reports",
    "tier": "write",
    "actions": [],
    "list": {
      "filters": [
        "budget_id",
        "company_id",
        "cost",
        "created_at",
        "custom_fields",
        "estimated_time",
        "for_tracking",
        "formulas",
        "full_query",
        "fuzzy_dates",
        "fuzzy_people",
        "id",
        "jump_query",
        "name",
        "number",
        "parent_company_id",
        "pending_invoicing",
        "person_id",
        "profit",
        "profit_margin",
        "project_color",
        "project_id",
        "project_number",
        "project_type",
        "projected_revenue",
        "query",
        "responsible_id",
        "revenue",
        "status",
        "template",
        "total_worked_time",
        "with_templates",
        "worked_time",
        "workflow_id"
      ],
      "sorts": [
        "average_profit_margin",
        "company",
        "count",
        "created_at",
        "custom_fields",
        "last_activity_at",
        "month",
        "project",
        "project_created_at",
        "project_custom_fields",
        "project_last_activity_at",
        "project_manager",
        "project_name",
        "project_number",
        "project_status",
        "project_type",
        "quarter",
        "total_cost",
        "total_estimated_time",
        "total_needs_invoicing",
        "total_pending_invoicing",
        "total_profit",
        "total_projected_revenue",
        "total_revenue",
        "total_worked_time",
        "week",
        "year"
      ],
      "groups": [
        "company",
        "created_at",
        "custom_fields",
        "last_activity_at",
        "month",
        "organization",
        "project",
        "project_manager",
        "project_status",
        "project_type",
        "quarter",
        "week",
        "year"
      ],
      "relationships": [
        "company",
        "company_report",
        "organization",
        "project",
        "project_manager",
        "project_manager_report",
        "report"
      ]
    }
  },
  "reports/proposal_reports": {
    "key": "reports/proposal_reports",
    "path": "/reports/proposal_reports",
    "tag": "Reports",
    "tier": "write",
    "actions": [],
    "list": {
      "filters": [
        "budget_total",
        "company_id",
        "created_at",
        "creator_id",
        "date_signed",
        "deal_id",
        "formulas",
        "id",
        "link_status",
        "responsible_id",
        "sent_at",
        "status",
        "status_changed_at",
        "tax_amount",
        "updated_at"
      ],
      "sorts": [
        "average_tax_rate_value",
        "company",
        "count",
        "created_at",
        "creator",
        "date_signed",
        "deal",
        "link_status",
        "name",
        "responsible",
        "sent_at",
        "signed",
        "signed_by_email",
        "status",
        "status_changed_at",
        "subsidiary",
        "total_budget_total",
        "total_tax_amount",
        "updated_at"
      ],
      "groups": [
        "company",
        "created_at",
        "creator",
        "currency",
        "date_signed",
        "deal",
        "link_status",
        "organization",
        "proposal",
        "responsible",
        "sent_at",
        "signed",
        "status",
        "status_changed_at",
        "subsidiary",
        "updated_at"
      ],
      "relationships": [
        "company",
        "company_report",
        "creator",
        "creator_report",
        "deal",
        "deal_report",
        "organization",
        "proposal",
        "report",
        "responsible",
        "responsible_report",
        "subsidiary"
      ]
    }
  },
  "reports/resource_request_reports": {
    "key": "reports/resource_request_reports",
    "path": "/reports/resource_request_reports",
    "tag": "Reports",
    "tier": "write",
    "actions": [],
    "list": {
      "filters": [
        "created_at",
        "creator_id",
        "custom_fields",
        "deleted_at",
        "ended_on",
        "id",
        "job_title",
        "query",
        "resolved_at",
        "resolver_id",
        "service_id",
        "service_type_id",
        "started_on",
        "status",
        "subsidiary_id",
        "tags",
        "team_id",
        "time",
        "time_to_close",
        "title",
        "workplace_id"
      ],
      "sorts": [
        "booking_method",
        "created_at",
        "creator",
        "custom_fields",
        "deal_or_budget_report.custom_fields",
        "ended_on",
        "resolver",
        "resource_request",
        "resource_request_created_at",
        "resource_request_ended_on",
        "resource_request_started_on",
        "service",
        "service_type",
        "started_on",
        "status",
        "subsidiary"
      ],
      "groups": [
        "booking_method",
        "created_at",
        "creator",
        "custom_fields",
        "deal_or_budget_report.custom_fields",
        "ended_on",
        "organization",
        "resolver",
        "resource_request",
        "service",
        "service_type",
        "started_on",
        "status",
        "subsidiary"
      ],
      "relationships": [
        "creator",
        "creator_report",
        "deal_or_budget_report",
        "organization",
        "report",
        "resolver",
        "resolver_report",
        "resource_request",
        "service",
        "service_report",
        "service_type",
        "subsidiary"
      ]
    }
  },
  "reports/salary_reports": {
    "key": "reports/salary_reports",
    "path": "/reports/salary_reports",
    "tag": "Reports",
    "tier": "write",
    "actions": [],
    "list": {
      "filters": [
        "annuall_cost",
        "bi_weekly_cost",
        "date",
        "ended_on",
        "estimated_weekly_hours",
        "formulas",
        "holiday_calendar_id",
        "hourly_cost",
        "id",
        "monthly_cost",
        "overhead",
        "people_custom_fields",
        "person_id",
        "salary_id",
        "salary_type_id",
        "started_on",
        "time",
        "weekly_cost"
      ],
      "sorts": [
        "count",
        "date",
        "engagement_ended_on",
        "engagement_started_on",
        "estimated_weekly_hours",
        "overhead",
        "people_custom_fields",
        "person",
        "salary_id",
        "salary_type_id",
        "time",
        "total_annually_cost",
        "total_bi_weekly_cost",
        "total_hourly_cost",
        "total_monthly_cost",
        "total_weekly_cost"
      ],
      "groups": [
        "date",
        "organization",
        "overhead",
        "people_custom_fields",
        "person",
        "salary",
        "salary_type_id"
      ],
      "relationships": [
        "organization",
        "person",
        "person_report",
        "report",
        "salary"
      ]
    }
  },
  "reports/service_reports": {
    "key": "reports/service_reports",
    "path": "/reports/service_reports",
    "tag": "Reports",
    "tier": "write",
    "actions": [],
    "list": {
      "filters": [
        "after",
        "before",
        "billable",
        "billable_time",
        "billing_type",
        "bookable_after",
        "bookable_before",
        "bookable_date",
        "bookable_date_for_period",
        "booked_time",
        "booking_tracking_enabled",
        "budget_cap_enabled",
        "budget_custom_fields",
        "budget_date",
        "budget_id",
        "budget_remaining",
        "budget_status",
        "budget_total",
        "budget_used",
        "budgeted_time",
        "budgets_and_deals",
        "company_id",
        "contract_id",
        "cost",
        "custom_fields",
        "deal_custom_fields",
        "deal_id",
        "deal_stage_id",
        "deal_status_id",
        "discount",
        "discount_amount",
        "estimated_cost",
        "estimated_time",
        "expense_cost",
        "expense_tracking_enabled",
        "explicit_access",
        "for_tracking",
        "formulas",
        "future_booked_time",
        "future_budget_used",
        "id",
        "initial_service_id",
        "left_to_schedule_time",
        "limitation_type",
        "markup",
        "markup_amount",
        "name",
        "origin_deal_id",
        "origin_service_id",
        "person_id",
        "pipeline_id",
        "price",
        "probability",
        "profit",
        "profit_margin",
        "project_id",
        "project_type",
        "projected_revenue",
        "projectless_budgets",
        "quantity",
        "query",
        "recognized_revenue",
        "remaining_scheduled_time",
        "responsible_id",
        "revamped_unit",
        "revenue",
        "rolled_over_time",
        "sales_status_id",
        "section_id",
        "service_type_id",
        "stage_status_id",
        "stage_type",
        "subsidiary_id",
        "task_id",
        "template",
        "time_tracking_enabled",
        "trackable_by_person_id",
        "type",
        "unapproved_time",
        "unit",
        "updated_at",
        "with_memberships",
        "worked_cost",
        "worked_time"
      ],
      "sorts": [
        "average_actual_rate",
        "average_budget_usage",
        "average_discount",
        "average_forecasted_budget_usage",
        "average_forecasted_time_usage",
        "average_markup",
        "average_profit_margin",
        "billable",
        "billing_type",
        "booking_tracking_enabled",
        "budget",
        "budget_cap_enabled",
        "budget_custom_fields",
        "budget_status",
        "company",
        "count",
        "custom_fields",
        "date",
        "deal_custom_fields",
        "deal_status",
        "expense_tracking_enabled",
        "limitation_type",
        "origin_deal",
        "pipeline",
        "project",
        "project_type",
        "responsible",
        "sales_status_id",
        "section",
        "section_name",
        "section_position",
        "service",
        "service_billable",
        "service_deal_date",
        "service_description",
        "service_discount",
        "service_markup",
        "service_name",
        "service_position",
        "service_type",
        "service_unit",
        "stage_status",
        "stage_type",
        "subsidiary",
        "time_tracking_enabled",
        "total_billable_time",
        "total_booked_time",
        "total_budget_remaining",
        "total_budget_total",
        "total_budget_used",
        "total_budgeted_time",
        "total_cost",
        "total_discount_amount",
        "total_estimated_cost",
        "total_estimated_remaining_time",
        "total_estimated_time",
        "total_expense_cost",
        "total_forecasted_billable_time",
        "total_forecasted_budget_used",
        "total_future_booked_time",
        "total_future_budget_used",
        "total_future_tentative_booked_time",
        "total_left_to_schedule_time",
        "total_markup_amount",
        "total_price",
        "total_profit",
        "total_projected_revenue",
        "total_recognized_revenue",
        "total_remaining_scheduled_time",
        "total_revenue",
        "total_rolled_over_time",
        "total_tentative_booked_time",
        "total_unapproved_time",
        "total_worked_cost",
        "total_worked_time",
        "unit"
      ],
      "groups": [
        "billable",
        "billing_type",
        "booking_tracking_enabled",
        "budget",
        "budget_cap_enabled",
        "budget_custom_fields",
        "budget_status",
        "company",
        "custom_fields",
        "date",
        "deal_custom_fields",
        "deal_status",
        "expense_tracking_enabled",
        "limitation_type",
        "organization",
        "origin_deal",
        "pipeline",
        "project",
        "project_type",
        "recurring",
        "responsible",
        "sales_status",
        "section",
        "section_name",
        "service",
        "service_type",
        "stage_status",
        "stage_type",
        "subsidiary",
        "time_tracking_enabled",
        "unit"
      ],
      "relationships": [
        "budget",
        "company",
        "company_report",
        "contract",
        "deal_or_budget_report",
        "deal_status",
        "organization",
        "origin_deal",
        "origin_deal_report",
        "owner_report",
        "pipeline",
        "project",
        "project_report",
        "report",
        "responsible",
        "section",
        "service",
        "service_type",
        "subsidiary"
      ]
    }
  },
  "reports/survey_reports": {
    "key": "reports/survey_reports",
    "path": "/reports/survey_reports",
    "tag": "Reports",
    "tier": "write",
    "actions": [],
    "list": {
      "filters": [
        "created_at",
        "creator_id",
        "editable",
        "id",
        "project_id",
        "query",
        "title"
      ],
      "sorts": [
        "count",
        "created_at",
        "creator",
        "project",
        "survey",
        "survey_id",
        "title",
        "updater"
      ],
      "groups": [
        "creator",
        "organization",
        "project",
        "survey",
        "updater"
      ],
      "relationships": [
        "creator",
        "organization",
        "project",
        "report",
        "survey",
        "updater"
      ]
    }
  },
  "reports/task_reports": {
    "key": "reports/task_reports",
    "path": "/reports/task_reports",
    "tag": "Reports",
    "tier": "write",
    "actions": [],
    "list": {
      "filters": [
        "after",
        "assignee_id",
        "before",
        "billable_time",
        "board_name",
        "board_status",
        "bookable_after",
        "bookable_before",
        "booked_time",
        "closed_after",
        "closed_at",
        "closed_before",
        "company_id",
        "created_at",
        "creator_id",
        "custom_fields",
        "date_range",
        "dependency_type",
        "due_date",
        "due_date_after",
        "due_date_before",
        "due_date_new",
        "due_date_on",
        "folder_id",
        "folder_name",
        "folder_status",
        "formulas",
        "full_query",
        "future_booked_time",
        "fuzzy_dates",
        "fuzzy_people",
        "id",
        "initial_estimate",
        "jump_query",
        "last_activity",
        "last_activity_after",
        "last_activity_before",
        "last_actor_id",
        "left_to_schedule_time",
        "net_unplanned_time",
        "overdue_status",
        "parent_task_id",
        "person_type",
        "project_id",
        "project_manager_id",
        "project_type",
        "public_access",
        "query",
        "query_extended",
        "remaining_time",
        "repeating",
        "service_id",
        "start_date",
        "start_date_after",
        "start_date_before",
        "status",
        "subscriber_id",
        "subtask",
        "tags",
        "task_list_id",
        "task_list_name",
        "task_list_status",
        "task_number",
        "task_type",
        "template",
        "template_id",
        "title",
        "trackable_by_person_id",
        "type_id",
        "updated_at",
        "worked_time",
        "workflow_id",
        "workflow_status_category_id",
        "workflow_status_id"
      ],
      "sorts": [
        "assignee",
        "closed_at",
        "company",
        "count",
        "created_at",
        "creator",
        "custom_fields",
        "due_date",
        "folder",
        "last_activity_at",
        "last_actor",
        "month",
        "parent_task",
        "placement",
        "project",
        "quarter",
        "service",
        "start_date",
        "status",
        "task",
        "task_closed_at",
        "task_created_at",
        "task_custom_fields",
        "task_due_date",
        "task_last_activity_at",
        "task_list",
        "task_number",
        "task_start_date",
        "title",
        "total_billable_time",
        "total_booked_time",
        "total_estimate_at_completion",
        "total_estimation_offset_time",
        "total_future_booked_time",
        "total_initial_estimate",
        "total_left_to_schedule_time",
        "total_net_unplanned_time",
        "total_remaining_time",
        "total_worked_time",
        "week",
        "workflow",
        "workflow_status",
        "workflow_status_category_id",
        "year"
      ],
      "groups": [
        "assignee",
        "closed_at",
        "company",
        "created_at",
        "creator",
        "custom_fields",
        "due_date",
        "folder",
        "last_activity_at",
        "last_actor",
        "month",
        "organization",
        "parent_task",
        "project",
        "quarter",
        "repeating",
        "service",
        "start_date",
        "status",
        "task",
        "task_list",
        "week",
        "workflow",
        "workflow_status",
        "workflow_status_category_id",
        "year"
      ],
      "relationships": [
        "assignee",
        "assignee_report",
        "board",
        "company",
        "company_report",
        "creator",
        "creator_report",
        "folder",
        "last_actor",
        "last_actor_report",
        "organization",
        "parent_task",
        "project",
        "project_report",
        "report",
        "service",
        "task",
        "task_list",
        "workflow",
        "workflow_status"
      ]
    }
  },
  "reports/time_entry_reports": {
    "key": "reports/time_entry_reports",
    "path": "/reports/time_entry_reports",
    "tag": "Reports",
    "tier": "write",
    "actions": [],
    "list": {
      "filters": [
        "after",
        "approval_policy_id",
        "approved_at",
        "approver_id",
        "assigned_approver_id",
        "autotracked",
        "awaiting_approval_from_approver_id",
        "base_cost",
        "before",
        "billable",
        "billable_time",
        "billing_type_id",
        "booking_id",
        "budget_id",
        "budget_type_id",
        "company_id",
        "cost",
        "created_after",
        "created_at",
        "created_before",
        "creator_id",
        "date",
        "deal_id",
        "deal_subsidiary_id",
        "designated_approver_id",
        "ended_at",
        "facility_overhead_cost",
        "formulas",
        "id",
        "intercompany_hours",
        "internal_overhead_cost",
        "invoice_attribution_id",
        "invoice_id",
        "invoiced",
        "invoicing_status",
        "jira_issue_id",
        "jira_issue_status",
        "jira_issue_summary",
        "jira_worklog_id",
        "last_activity_at",
        "last_actor_id",
        "note",
        "overhead",
        "overhead_cost",
        "parent_company_id",
        "people_custom_fields",
        "person_id",
        "person_manager_id",
        "person_subsidiary_id",
        "person_tags",
        "project_id",
        "project_manager_id",
        "project_type_id",
        "query",
        "responsible_id",
        "role_id",
        "section_name",
        "service_id",
        "service_type_id",
        "stage_type",
        "started_after",
        "started_at",
        "started_before",
        "status",
        "task_id",
        "task_list_id",
        "time",
        "track_method_id",
        "unit_id",
        "updated_at"
      ],
      "sorts": [
        "approval_policy",
        "approver",
        "autotracked",
        "average_blended_rate",
        "average_recognized_margin",
        "billing_type",
        "budget",
        "company",
        "count",
        "created_at",
        "creator",
        "custom_fields",
        "date",
        "day",
        "deal_subsidiary",
        "designated_approver",
        "ended_at",
        "intercompany_hours",
        "invoiced",
        "invoicing_status",
        "jira_issue_id",
        "jira_issue_status",
        "jira_issue_summary",
        "last_activity_at",
        "last_actor",
        "month",
        "overhead",
        "people_custom_fields",
        "person",
        "person_manager",
        "person_subsidiary",
        "project",
        "project_type_id",
        "quarter",
        "responsible",
        "section_name",
        "service",
        "service_type",
        "stage_type",
        "started_at",
        "status",
        "task",
        "task_list",
        "time_entry",
        "time_entry_created_at",
        "time_entry_date",
        "time_entry_ended_at",
        "time_entry_last_activity_at",
        "time_entry_started_at",
        "total_billable_revenue",
        "total_billable_time",
        "total_cost",
        "total_facility_overhead_cost",
        "total_internal_overhead_cost",
        "total_overhead_cost",
        "total_recognized_profit",
        "total_recognized_revenue",
        "total_recognized_time",
        "total_time",
        "total_work_cost",
        "track_method_id",
        "unit_id",
        "week",
        "year"
      ],
      "groups": [
        "approval_policy",
        "approver",
        "autotracked",
        "billing_type",
        "budget",
        "company",
        "created_at",
        "creator",
        "custom_fields",
        "date",
        "day",
        "deal_subsidiary",
        "designated_approver",
        "ended_at",
        "intercompany_hours",
        "invoice",
        "invoiced",
        "invoicing_status",
        "jira_issue_id",
        "jira_issue_status",
        "jira_issue_summary",
        "last_activity_at",
        "last_actor",
        "month",
        "organization",
        "overhead",
        "people_custom_fields",
        "person",
        "person_manager",
        "person_subsidiary",
        "project",
        "project_type_id",
        "quarter",
        "responsible",
        "section_name",
        "service",
        "service_type",
        "stage_type",
        "started_at",
        "status",
        "task",
        "task_list",
        "time_entry",
        "track_method_id",
        "unit_id",
        "week",
        "year"
      ],
      "relationships": [
        "approval_policy",
        "approver",
        "approver_report",
        "budget",
        "company",
        "company_report",
        "creator",
        "creator_report",
        "deal_or_budget_report",
        "deal_subsidiary",
        "designated_approver",
        "invoice",
        "last_actor",
        "last_actor_report",
        "organization",
        "person",
        "person_report",
        "person_subsidiary",
        "project",
        "project_report",
        "report",
        "responsible",
        "responsible_report",
        "service",
        "service_report",
        "service_type",
        "task",
        "task_list",
        "task_report",
        "time_entry"
      ]
    }
  },
  "reports/time_reports": {
    "key": "reports/time_reports",
    "path": "/reports/time_reports",
    "tag": "Reports",
    "tier": "write",
    "actions": [],
    "list": {
      "filters": [
        "after",
        "before",
        "billing_type",
        "bookings_after",
        "bookings_before",
        "bookings_custom_fields",
        "budget_id",
        "budget_tags",
        "company_id",
        "date",
        "day",
        "event_id",
        "formulas",
        "future",
        "job_role_id",
        "month",
        "people_custom_fields",
        "person_id",
        "person_tags",
        "person_type",
        "project_id",
        "project_type",
        "quarter",
        "role_id",
        "role_type",
        "service_id",
        "service_type_id",
        "stage_type",
        "subsidiary_id",
        "week",
        "year"
      ],
      "sorts": [
        "available_time",
        "average_cost_rate",
        "billable_time",
        "billing_type",
        "bookings_custom_fields",
        "budget",
        "capacity",
        "client_time",
        "company",
        "count",
        "date",
        "day",
        "draft_scheduled_billable_time",
        "draft_scheduled_client_time",
        "draft_scheduled_internal_time",
        "draft_scheduled_time",
        "event",
        "event_time",
        "future",
        "holiday_time",
        "internal_time",
        "job_role",
        "manager",
        "month",
        "paid_event_time",
        "people_custom_fields",
        "person",
        "person_company",
        "person_title",
        "person_type",
        "project",
        "quarter",
        "recognized_scheduled_time",
        "recognized_time",
        "scheduled_billable_time",
        "scheduled_client_time",
        "scheduled_event_time",
        "scheduled_internal_time",
        "scheduled_remote_work_time",
        "scheduled_time",
        "service",
        "service_type",
        "stage_type",
        "subsidiary",
        "total_cost",
        "total_draft_scheduled_cost",
        "total_draft_scheduled_revenue",
        "total_scheduled_cost",
        "total_scheduled_revenue",
        "total_work_cost",
        "unapproved_time",
        "unpaid_event_time",
        "week",
        "worked_time",
        "workload",
        "year"
      ],
      "groups": [
        "billing_type",
        "budget",
        "company",
        "date",
        "day",
        "event",
        "future",
        "job_role",
        "manager",
        "month",
        "organization",
        "people_custom_fields",
        "person",
        "project",
        "quarter",
        "service",
        "service_type",
        "stage_type",
        "subsidiary",
        "week",
        "year"
      ],
      "relationships": [
        "budget",
        "company",
        "company_report",
        "deal_or_budget_report",
        "event",
        "job_role",
        "manager",
        "organization",
        "person",
        "person_report",
        "project",
        "project_report",
        "report",
        "service",
        "service_type",
        "subsidiary"
      ]
    }
  },
  "reports/timesheet_reports": {
    "key": "reports/timesheet_reports",
    "path": "/reports/timesheet_reports",
    "tag": "Reports",
    "tier": "write",
    "actions": [],
    "list": {
      "filters": [
        "after",
        "before",
        "people_custom_fields",
        "person_id",
        "person_status",
        "query",
        "tags",
        "week_submission_status"
      ],
      "sorts": [
        "count",
        "friday_capacity",
        "friday_time",
        "monday_capacity",
        "monday_time",
        "person",
        "saturday_capacity",
        "saturday_time",
        "sunday_capacity",
        "sunday_time",
        "thursday_capacity",
        "thursday_time",
        "tuesday_capacity",
        "tuesday_time",
        "wednesday_capacity",
        "wednesday_time",
        "week",
        "week_submission_status"
      ],
      "groups": [
        "organization",
        "person",
        "week"
      ],
      "relationships": [
        "organization",
        "person",
        "report"
      ]
    }
  },
  "resource_requests": {
    "key": "resource_requests",
    "path": "/resource_requests",
    "tag": "Resource Requests",
    "tier": "write",
    "actions": [
      {
        "id": "PATCH /resource_requests/{id}/cancel",
        "name": "cancel",
        "method": "PATCH",
        "path": "/resource_requests/{id}/cancel",
        "summary": "Cancel a resource request",
        "requiresId": true,
        "tier": "write"
      },
      {
        "id": "PATCH /resource_requests/{id}/reject",
        "name": "reject",
        "method": "PATCH",
        "path": "/resource_requests/{id}/reject",
        "summary": "Reject a resource request",
        "requiresId": true,
        "tier": "write"
      },
      {
        "id": "POST /resource_requests/{id}/resolve",
        "name": "resolve",
        "method": "POST",
        "path": "/resource_requests/{id}/resolve",
        "summary": "Resolve a resource request by creating bookings",
        "requiresId": true,
        "tier": "write"
      }
    ],
    "list": {
      "filters": [
        "created_at",
        "creator_id",
        "custom_fields",
        "deleted_at",
        "ended_on",
        "id",
        "job_title",
        "query",
        "resolved_at",
        "resolver_id",
        "service_id",
        "service_type_id",
        "started_on",
        "status",
        "subsidiary_id",
        "tags",
        "team_id",
        "time",
        "time_to_close",
        "title",
        "workplace_id"
      ],
      "sorts": [
        "booking_method_id",
        "created_at",
        "creator",
        "ended_on",
        "id",
        "percentage",
        "resolved_at",
        "resolver",
        "service",
        "started_on",
        "status",
        "time",
        "total_time"
      ],
      "relationships": [
        "creator",
        "custom_field_attachments",
        "custom_field_people",
        "organization",
        "resolver",
        "service"
      ]
    },
    "get": {
      "relationships": [
        "creator",
        "custom_field_attachments",
        "custom_field_people",
        "organization",
        "resolver",
        "service"
      ]
    },
    "remove": true
  },
  "revenue_distributions": {
    "key": "revenue_distributions",
    "path": "/revenue_distributions",
    "tag": "Revenue Distributions",
    "tier": "financial",
    "actions": [],
    "list": {
      "filters": [
        "amount",
        "amount_percent",
        "created_at",
        "creator_id",
        "deal_id",
        "end_on",
        "id",
        "start_on"
      ],
      "sorts": [
        "amount",
        "amount_percent",
        "created_at",
        "deal",
        "deal_id",
        "end_on",
        "id",
        "start_on"
      ],
      "relationships": [
        "deal",
        "organization"
      ]
    },
    "get": {
      "relationships": [
        "deal",
        "organization"
      ]
    },
    "remove": true
  },
  "roles": {
    "key": "roles",
    "path": "/roles",
    "tag": "Permission Sets",
    "tier": "admin",
    "actions": [],
    "list": {
      "filters": [
        "active_agents_count",
        "active_users_count",
        "base_role_id",
        "id",
        "inactive_agents_count",
        "inactive_users_count",
        "name",
        "permissions",
        "user_type_id"
      ],
      "sorts": [
        "active_agents_count",
        "active_users_count",
        "description",
        "inactive_agents_count",
        "inactive_users_count",
        "name"
      ],
      "relationships": [
        "organization"
      ]
    },
    "create": {
      "required": [
        "name",
        "user_type_id"
      ],
      "attributes": [
        "base_role_id",
        "description",
        "name",
        "permissions",
        "user_type_id"
      ],
      "relationships": []
    },
    "get": {
      "relationships": [
        "organization"
      ]
    },
    "update": {
      "required": [
        "name",
        "user_type_id"
      ],
      "attributes": [
        "base_role_id",
        "description",
        "name",
        "permissions",
        "user_type_id"
      ],
      "relationships": []
    },
    "remove": true
  },
  "salaries": {
    "key": "salaries",
    "path": "/salaries",
    "tag": "Salaries",
    "tier": "financial",
    "actions": [],
    "list": {
      "filters": [
        "after",
        "before",
        "person_id"
      ],
      "sorts": [],
      "relationships": [
        "holiday_calendar",
        "organization",
        "person"
      ]
    },
    "create": {
      "required": [
        "cost",
        "currency",
        "person_id",
        "salary_type_id",
        "working_hours"
      ],
      "attributes": [
        "alternating_hours",
        "cost",
        "currency",
        "ended_on",
        "holiday_calendar_id",
        "note",
        "overhead",
        "person_id",
        "salary_type_id",
        "started_on",
        "working_hours"
      ],
      "relationships": []
    },
    "get": {
      "relationships": [
        "holiday_calendar",
        "organization",
        "person"
      ]
    },
    "update": {
      "required": [
        "cost",
        "currency",
        "person_id",
        "salary_type_id",
        "working_hours"
      ],
      "attributes": [
        "alternating_hours",
        "cost",
        "currency",
        "ended_on",
        "holiday_calendar_id",
        "note",
        "overhead",
        "person_id",
        "salary_type_id",
        "started_on",
        "working_hours"
      ],
      "relationships": []
    },
    "remove": true
  },
  "sections": {
    "key": "sections",
    "path": "/sections",
    "tag": "Sections",
    "tier": "write",
    "actions": [],
    "list": {
      "filters": [
        "budget_id",
        "deal_id",
        "id",
        "name"
      ],
      "sorts": [],
      "relationships": [
        "deal",
        "organization"
      ]
    },
    "create": {
      "required": [
        "deal_id"
      ],
      "attributes": [
        "deal_id",
        "editor_config",
        "name",
        "position",
        "preferences"
      ],
      "relationships": []
    },
    "get": {
      "relationships": [
        "deal",
        "organization"
      ]
    },
    "update": {
      "required": [
        "deal_id"
      ],
      "attributes": [
        "deal_id",
        "editor_config",
        "name",
        "position",
        "preferences"
      ],
      "relationships": []
    },
    "remove": true
  },
  "service_assignments": {
    "key": "service_assignments",
    "path": "/service_assignments",
    "tag": "Service Assignments",
    "tier": "write",
    "actions": [],
    "list": {
      "filters": [
        "id",
        "person_id",
        "service_id"
      ],
      "sorts": [],
      "relationships": [
        "organization",
        "person",
        "service"
      ]
    },
    "create": {
      "required": [
        "person_id",
        "service_id"
      ],
      "attributes": [
        "person_id",
        "service_id"
      ],
      "relationships": []
    },
    "get": {
      "relationships": [
        "organization",
        "person",
        "service"
      ]
    },
    "update": {
      "required": [
        "person_id",
        "service_id"
      ],
      "attributes": [
        "person_id",
        "service_id"
      ],
      "relationships": []
    },
    "remove": true
  },
  "service_type_assignments": {
    "key": "service_type_assignments",
    "path": "/service_type_assignments",
    "tag": "Service Type Assignments",
    "tier": "write",
    "actions": [],
    "list": {
      "filters": [
        "id",
        "person_id",
        "service_type_id"
      ],
      "sorts": [],
      "relationships": [
        "organization",
        "person",
        "service_type"
      ]
    },
    "create": {
      "required": [
        "person_id",
        "service_type_id"
      ],
      "attributes": [
        "person_id",
        "service_type_id"
      ],
      "relationships": []
    },
    "get": {
      "relationships": [
        "organization",
        "person",
        "service_type"
      ]
    },
    "update": {
      "required": [
        "person_id",
        "service_type_id"
      ],
      "attributes": [
        "person_id",
        "service_type_id"
      ],
      "relationships": []
    },
    "remove": true
  },
  "service_types": {
    "key": "service_types",
    "path": "/service_types",
    "tag": "Service Types",
    "tier": "write",
    "actions": [
      {
        "id": "PATCH /service_types/{id}/archive",
        "name": "archive",
        "method": "PATCH",
        "path": "/service_types/{id}/archive",
        "summary": "Archives a service type",
        "requiresId": true,
        "tier": "write"
      },
      {
        "id": "PATCH /service_types/merge",
        "name": "bulk_merge",
        "method": "PATCH",
        "path": "/service_types/merge",
        "summary": "Merge a service type",
        "requiresId": false,
        "collectionWide": true,
        "tier": "write"
      }
    ],
    "list": {
      "filters": [
        "id",
        "name",
        "person_id",
        "query",
        "status"
      ],
      "sorts": [],
      "relationships": [
        "assignees",
        "organization"
      ]
    },
    "create": {
      "required": [
        "name"
      ],
      "attributes": [
        "name"
      ],
      "relationships": []
    },
    "get": {
      "relationships": [
        "assignees",
        "organization"
      ]
    },
    "update": {
      "required": [
        "name"
      ],
      "attributes": [
        "name"
      ],
      "relationships": []
    }
  },
  "services": {
    "key": "services",
    "path": "/services",
    "tag": "Services",
    "tier": "write",
    "actions": [],
    "list": {
      "filters": [
        "after",
        "before",
        "billable",
        "billable_time",
        "billing_type",
        "bookable_after",
        "bookable_before",
        "bookable_date",
        "bookable_date_for_period",
        "booked_time",
        "booking_tracking_enabled",
        "budget_cap_enabled",
        "budget_date",
        "budget_id",
        "budget_remaining",
        "budget_status",
        "budget_total",
        "budget_used",
        "budgeted_time",
        "budgets_and_deals",
        "company_id",
        "contract_id",
        "cost",
        "custom_fields",
        "deal_id",
        "deal_stage_id",
        "deal_status_id",
        "discount",
        "discount_amount",
        "estimated_cost",
        "estimated_time",
        "expense_cost",
        "expense_tracking_enabled",
        "explicit_access",
        "for_tracking",
        "future_booked_time",
        "future_budget_used",
        "id",
        "initial_service_id",
        "left_to_schedule_time",
        "limitation_type",
        "markup",
        "markup_amount",
        "name",
        "origin_deal_id",
        "origin_service_id",
        "person_id",
        "pipeline_id",
        "price",
        "probability",
        "profit",
        "profit_margin",
        "project_id",
        "project_type",
        "projected_revenue",
        "projectless_budgets",
        "quantity",
        "query",
        "remaining_scheduled_time",
        "responsible_id",
        "revamped_unit",
        "revenue",
        "rolled_over_time",
        "sales_status_id",
        "section_id",
        "service_type_id",
        "stage_status_id",
        "stage_type",
        "subsidiary_id",
        "task_id",
        "template",
        "time_tracking_enabled",
        "trackable_by_person_id",
        "type",
        "unapproved_time",
        "unit",
        "updated_at",
        "with_memberships",
        "worked_cost",
        "worked_time"
      ],
      "sorts": [
        "budget",
        "company",
        "custom_fields",
        "name",
        "project_name"
      ],
      "relationships": [
        "custom_field_attachments",
        "custom_field_people",
        "deal",
        "import",
        "organization",
        "person",
        "section",
        "service_type"
      ]
    },
    "create": {
      "required": [
        "deal_id",
        "limitation_type",
        "name"
      ],
      "attributes": [
        "billing_type_id",
        "booking_tracking_enabled",
        "budget_cap_enabled",
        "custom_fields",
        "deal_id",
        "discount",
        "editor_config",
        "estimated_cost",
        "estimated_time",
        "expense_tracking_enabled",
        "limitation_type",
        "markup",
        "name",
        "person_id",
        "position",
        "price",
        "quantity",
        "rolled_over_time",
        "section_id",
        "service_type_id",
        "time_tracking_enabled",
        "unit_id"
      ],
      "relationships": []
    },
    "get": {
      "relationships": [
        "custom_field_attachments",
        "custom_field_people",
        "deal",
        "import",
        "organization",
        "person",
        "section",
        "service_type"
      ]
    },
    "update": {
      "required": [
        "deal_id",
        "limitation_type",
        "name"
      ],
      "attributes": [
        "billing_type_id",
        "booking_tracking_enabled",
        "budget_cap_enabled",
        "custom_fields",
        "deal_id",
        "discount",
        "editor_config",
        "estimated_cost",
        "estimated_time",
        "expense_tracking_enabled",
        "limitation_type",
        "markup",
        "name",
        "person_id",
        "position",
        "price",
        "quantity",
        "rolled_over_time",
        "section_id",
        "service_type_id",
        "time_tracking_enabled",
        "unit_id"
      ],
      "relationships": []
    },
    "remove": true
  },
  "subsidiaries": {
    "key": "subsidiaries",
    "path": "/subsidiaries",
    "tag": "Subsidiaries",
    "tier": "financial",
    "actions": [
      {
        "id": "PATCH /subsidiaries/{id}/archive",
        "name": "archive",
        "method": "PATCH",
        "path": "/subsidiaries/{id}/archive",
        "summary": "Archives a subsidiary",
        "requiresId": true,
        "tier": "financial"
      }
    ],
    "list": {
      "filters": [
        "id",
        "status"
      ],
      "sorts": [
        "name"
      ],
      "relationships": [
        "bill_from",
        "custom_domain",
        "default_bank_account",
        "default_document_type",
        "default_tax_rate",
        "einvoice_configuration",
        "einvoice_identity",
        "integration",
        "organization"
      ]
    },
    "create": {
      "required": [
        "name"
      ],
      "attributes": [
        "custom_domain_id",
        "default_bank_account_id",
        "default_document_type_id",
        "default_tax_rate_id",
        "facility_costs",
        "facility_costs_breakdown",
        "invoice_logo_url",
        "invoice_number_format",
        "invoice_number_scope",
        "name",
        "show_delivery_date"
      ],
      "relationships": []
    },
    "get": {
      "relationships": [
        "bill_from",
        "custom_domain",
        "default_bank_account",
        "default_document_type",
        "default_tax_rate",
        "einvoice_configuration",
        "einvoice_identity",
        "integration",
        "organization"
      ]
    },
    "update": {
      "required": [
        "name"
      ],
      "attributes": [
        "custom_domain_id",
        "default_bank_account_id",
        "default_document_type_id",
        "default_tax_rate_id",
        "facility_costs",
        "facility_costs_breakdown",
        "invoice_logo_url",
        "invoice_number_format",
        "invoice_number_scope",
        "name",
        "show_delivery_date"
      ],
      "relationships": []
    }
  },
  "survey_field_options": {
    "key": "survey_field_options",
    "path": "/survey_field_options",
    "tag": "Survey Field Options",
    "tier": "write",
    "actions": [
      {
        "id": "PATCH /survey_field_options/{id}/archive",
        "name": "archive",
        "method": "PATCH",
        "path": "/survey_field_options/{id}/archive",
        "summary": "Archives a survey field option",
        "requiresId": true,
        "tier": "write"
      }
    ],
    "list": {
      "filters": [
        "archived",
        "custom_field_id",
        "survey_field_id"
      ],
      "sorts": [],
      "relationships": [
        "organization",
        "survey_field"
      ]
    },
    "create": {
      "required": [],
      "attributes": [
        "color_id",
        "name",
        "position",
        "survey_field_id"
      ],
      "relationships": []
    },
    "get": {
      "relationships": [
        "organization",
        "survey_field"
      ]
    },
    "update": {
      "required": [],
      "attributes": [
        "color_id",
        "name",
        "position",
        "survey_field_id"
      ],
      "relationships": []
    }
  },
  "survey_fields": {
    "key": "survey_fields",
    "path": "/survey_fields",
    "tag": "Survey Fields",
    "tier": "write",
    "actions": [
      {
        "id": "PATCH /survey_fields/{id}/archive",
        "name": "archive",
        "method": "PATCH",
        "path": "/survey_fields/{id}/archive",
        "summary": "Archives a survey field",
        "requiresId": true,
        "tier": "write"
      }
    ],
    "list": {
      "filters": [
        "archived",
        "global",
        "name",
        "origin_field_id",
        "project_id",
        "show_in_add_edit_views",
        "survey_id"
      ],
      "sorts": [
        "created_at",
        "id",
        "name",
        "project_id",
        "survey_id",
        "updated_at"
      ],
      "relationships": [
        "custom_field_people",
        "options",
        "organization",
        "origin_field",
        "survey"
      ]
    },
    "create": {
      "required": [
        "data_type_id",
        "name",
        "survey_id"
      ],
      "attributes": [
        "aggregation_type_id",
        "data_type_id",
        "formatting_type_id",
        "name",
        "origin_field_id",
        "position",
        "quick_add_enabled",
        "required",
        "show_in_add_edit_views",
        "survey_id"
      ],
      "relationships": []
    },
    "get": {
      "relationships": [
        "custom_field_people",
        "options",
        "organization",
        "origin_field",
        "survey"
      ]
    },
    "update": {
      "required": [
        "data_type_id",
        "name",
        "survey_id"
      ],
      "attributes": [
        "aggregation_type_id",
        "data_type_id",
        "formatting_type_id",
        "name",
        "origin_field_id",
        "position",
        "quick_add_enabled",
        "required",
        "show_in_add_edit_views",
        "survey_id"
      ],
      "relationships": []
    }
  },
  "survey_responses": {
    "key": "survey_responses",
    "path": "/survey_responses",
    "tag": "Survey Responses",
    "tier": "write",
    "actions": [],
    "list": {
      "filters": [
        "created_at",
        "creator_id",
        "custom_fields",
        "id",
        "survey_id"
      ],
      "sorts": [
        "created_at",
        "creator",
        "creator_id",
        "custom_fields",
        "id",
        "survey_id",
        "updated_at"
      ],
      "relationships": [
        "creator",
        "custom_field_attachments",
        "organization",
        "survey"
      ]
    },
    "create": {
      "required": [],
      "attributes": [
        "custom_fields",
        "survey_fields",
        "survey_id"
      ],
      "relationships": []
    },
    "get": {
      "relationships": [
        "creator",
        "custom_field_attachments",
        "organization",
        "survey"
      ]
    },
    "remove": true
  },
  "surveys": {
    "key": "surveys",
    "path": "/surveys",
    "tag": "Surveys",
    "tier": "write",
    "actions": [
      {
        "id": "POST /surveys/copy",
        "name": "copy",
        "method": "POST",
        "path": "/surveys/copy",
        "summary": "Copies a survey",
        "requiresId": false,
        "tier": "write"
      }
    ],
    "list": {
      "filters": [
        "created_at",
        "creator_id",
        "editable",
        "id",
        "project_id",
        "query",
        "title"
      ],
      "sorts": [
        "id",
        "title"
      ],
      "relationships": [
        "creator",
        "organization",
        "project",
        "updater"
      ]
    },
    "create": {
      "required": [
        "project_id",
        "title"
      ],
      "attributes": [
        "project_id",
        "submission_access",
        "title"
      ],
      "relationships": []
    },
    "get": {
      "relationships": [
        "creator",
        "organization",
        "project",
        "updater"
      ]
    },
    "update": {
      "required": [
        "project_id",
        "title"
      ],
      "attributes": [
        "project_id",
        "submission_access",
        "title"
      ],
      "relationships": []
    },
    "remove": true
  },
  "tags": {
    "key": "tags",
    "path": "/tags",
    "tag": "Tags",
    "tier": "write",
    "actions": [],
    "list": {
      "filters": [
        "company_id",
        "deal_id",
        "invoice_id",
        "name",
        "person_id",
        "project_id",
        "taggable_type",
        "task_id"
      ],
      "sorts": [],
      "relationships": []
    },
    "get": {
      "relationships": []
    }
  },
  "task_dependencies": {
    "key": "task_dependencies",
    "path": "/task_dependencies",
    "tag": "TaskDependency",
    "tier": "write",
    "actions": [],
    "list": {
      "filters": [
        "created_at",
        "creator_id",
        "deleted_at",
        "dependent_task_id",
        "id",
        "project_id",
        "task_id",
        "type_id",
        "updated_at",
        "updater_id"
      ],
      "sorts": [],
      "relationships": [
        "dependent_task",
        "organization",
        "reverse_dependency",
        "task"
      ]
    },
    "create": {
      "required": [
        "dependent_task_id",
        "task_id",
        "type_id"
      ],
      "attributes": [
        "dependent_task_id",
        "task_id",
        "type_id"
      ],
      "relationships": []
    },
    "get": {
      "relationships": [
        "dependent_task",
        "organization",
        "reverse_dependency",
        "task"
      ]
    },
    "update": {
      "required": [
        "dependent_task_id",
        "task_id",
        "type_id"
      ],
      "attributes": [
        "dependent_task_id",
        "task_id",
        "type_id"
      ],
      "relationships": []
    },
    "remove": true
  },
  "task_lists": {
    "key": "task_lists",
    "path": "/task_lists",
    "tag": "Task Lists",
    "tier": "write",
    "actions": [
      {
        "id": "PATCH /task_lists/{id}/archive",
        "name": "archive",
        "method": "PATCH",
        "path": "/task_lists/{id}/archive",
        "summary": "Archives a task list",
        "requiresId": true,
        "tier": "write"
      },
      {
        "id": "POST /task_lists/copy",
        "name": "copy",
        "method": "POST",
        "path": "/task_lists/copy",
        "summary": "Copies a task list",
        "requiresId": false,
        "tier": "write",
        "body": {
          "required": [
            "folder_id",
            "name",
            "project_id",
            "template_id"
          ],
          "attributes": [
            "folder_id",
            "name",
            "project_id",
            "template_id"
          ],
          "relationships": []
        }
      },
      {
        "id": "PATCH /task_lists/{id}/move",
        "name": "move",
        "method": "PATCH",
        "path": "/task_lists/{id}/move",
        "summary": "Moves a task list",
        "requiresId": true,
        "tier": "write",
        "body": {
          "required": [
            "folder_id"
          ],
          "attributes": [
            "folder_id",
            "map"
          ],
          "relationships": []
        }
      },
      {
        "id": "PATCH /task_lists/{id}/reposition",
        "name": "reposition",
        "method": "PATCH",
        "path": "/task_lists/{id}/reposition",
        "summary": "Repositions a task list",
        "requiresId": true,
        "tier": "write",
        "body": {
          "required": [],
          "attributes": [
            "move_after_id",
            "move_before_id"
          ],
          "relationships": []
        }
      },
      {
        "id": "PATCH /task_lists/{id}/restore",
        "name": "restore",
        "method": "PATCH",
        "path": "/task_lists/{id}/restore",
        "summary": "Restores a task list",
        "requiresId": true,
        "tier": "write"
      }
    ],
    "list": {
      "filters": [
        "folder_id",
        "id",
        "project_id",
        "query",
        "restorable",
        "status"
      ],
      "sorts": [
        "board_name",
        "company_name",
        "folder_name",
        "project_name"
      ],
      "relationships": [
        "board",
        "folder",
        "organization",
        "project"
      ]
    },
    "create": {
      "required": [
        "folder_id",
        "name",
        "project_id"
      ],
      "attributes": [
        "folder_id",
        "name",
        "position",
        "project_id"
      ],
      "relationships": []
    },
    "get": {
      "relationships": [
        "board",
        "folder",
        "organization",
        "project"
      ]
    },
    "update": {
      "required": [
        "folder_id",
        "name",
        "project_id"
      ],
      "attributes": [
        "folder_id",
        "name",
        "position",
        "project_id"
      ],
      "relationships": []
    }
  },
  "tasks": {
    "key": "tasks",
    "path": "/tasks",
    "tag": "Tasks",
    "tier": "write",
    "actions": [
      {
        "id": "POST /tasks/copy",
        "name": "copy",
        "method": "POST",
        "path": "/tasks/copy",
        "summary": "Copies a task",
        "requiresId": false,
        "tier": "write",
        "body": {
          "required": [
            "private",
            "project_id",
            "task_list_id",
            "template_id",
            "title",
            "workflow_status_id"
          ],
          "attributes": [
            "copy_as_task_template",
            "parent_task_id",
            "private",
            "project_id",
            "task_list_id",
            "template_description",
            "template_id",
            "title",
            "workflow_status_id"
          ],
          "relationships": []
        }
      },
      {
        "id": "PATCH /tasks/{id}/move_dependent",
        "name": "move_dependent",
        "method": "PATCH",
        "path": "/tasks/{id}/move_dependent",
        "summary": "Moves a task and its dependent tasks by a given number of working days",
        "requiresId": true,
        "tier": "write",
        "body": {
          "required": [
            "days_count"
          ],
          "attributes": [
            "days_count",
            "skip_root_task"
          ],
          "relationships": []
        }
      },
      {
        "id": "PATCH /tasks/{id}/reposition",
        "name": "reposition",
        "method": "PATCH",
        "path": "/tasks/{id}/reposition",
        "summary": "Repositions a task",
        "requiresId": true,
        "tier": "write",
        "body": {
          "required": [],
          "attributes": [
            "move_after_id",
            "move_before_id",
            "subtask"
          ],
          "relationships": []
        }
      }
    ],
    "list": {
      "filters": [
        "after",
        "assignee_id",
        "before",
        "billable_time",
        "board_status",
        "bookable_after",
        "bookable_before",
        "closed_after",
        "closed_at",
        "closed_before",
        "company_id",
        "created_at",
        "creator_id",
        "custom_fields",
        "date_range",
        "dependency_type",
        "due_date",
        "due_date_after",
        "due_date_before",
        "due_date_new",
        "due_date_on",
        "folder_id",
        "folder_name",
        "folder_status",
        "full_query",
        "fuzzy_dates",
        "fuzzy_people",
        "id",
        "initial_estimate",
        "jump_query",
        "last_activity",
        "last_activity_after",
        "last_activity_before",
        "last_actor_id",
        "overdue_status",
        "parent_task_id",
        "person_type",
        "project_id",
        "project_manager_id",
        "project_type",
        "public_access",
        "query",
        "query_extended",
        "remaining_time",
        "repeating",
        "service_id",
        "start_date",
        "start_date_after",
        "start_date_before",
        "status",
        "subscriber_id",
        "subtask",
        "tags",
        "task_list_id",
        "task_list_name",
        "task_list_status",
        "task_number",
        "task_type",
        "template",
        "template_id",
        "title",
        "trackable_by_person_id",
        "type_id",
        "updated_at",
        "worked_time",
        "workflow_id",
        "workflow_status_category_id",
        "workflow_status_id"
      ],
      "sorts": [
        "assignee_name",
        "billable_time",
        "board_name",
        "board_position",
        "closed_at",
        "company_name",
        "created_at",
        "creator_name",
        "custom_fields",
        "due_date",
        "folder_name",
        "folder_position",
        "id",
        "initial_estimate",
        "last_activity",
        "last_activity_at",
        "last_actor_name",
        "number",
        "placement",
        "project_name",
        "remaining_time",
        "start_date",
        "task_list_name",
        "task_list_position",
        "task_number",
        "title",
        "updated_at",
        "worked_time",
        "workflow_status_name",
        "workflow_status_position"
      ],
      "relationships": [
        "assignee",
        "attachments",
        "creator",
        "custom_field_attachments",
        "custom_field_people",
        "last_actor",
        "organization",
        "parent_task",
        "project",
        "repeated_task",
        "service",
        "task_list",
        "template_object",
        "workflow_status"
      ]
    },
    "create": {
      "required": [
        "project_id",
        "task_list_id",
        "title"
      ],
      "attributes": [
        "assignee_id",
        "attachment_ids",
        "custom_fields",
        "description",
        "due_date",
        "due_time",
        "initial_estimate",
        "parent_task_id",
        "private",
        "project_id",
        "remaining_time",
        "repeat_on_date",
        "repeat_on_interval",
        "repeat_on_monthday",
        "repeat_on_weekday",
        "repeat_schedule_id",
        "service_id",
        "skip_reposition",
        "start_date",
        "subscriber_ids",
        "tag_list",
        "task_list_id",
        "title",
        "type_id",
        "workflow_status_id"
      ],
      "relationships": []
    },
    "get": {
      "relationships": [
        "assignee",
        "attachments",
        "creator",
        "custom_field_attachments",
        "custom_field_people",
        "last_actor",
        "organization",
        "parent_task",
        "project",
        "repeated_task",
        "service",
        "task_list",
        "template_object",
        "workflow_status"
      ]
    },
    "update": {
      "required": [
        "project_id",
        "task_list_id",
        "title"
      ],
      "attributes": [
        "assignee_id",
        "attachment_ids",
        "custom_fields",
        "description",
        "due_date",
        "due_time",
        "initial_estimate",
        "parent_task_id",
        "private",
        "project_id",
        "remaining_time",
        "repeat_on_date",
        "repeat_on_interval",
        "repeat_on_monthday",
        "repeat_on_weekday",
        "repeat_schedule_id",
        "service_id",
        "skip_reposition",
        "start_date",
        "subscriber_ids",
        "tag_list",
        "task_list_id",
        "title",
        "type_id",
        "workflow_status_id"
      ],
      "relationships": []
    },
    "remove": true
  },
  "tax_rates": {
    "key": "tax_rates",
    "path": "/tax_rates",
    "tag": "TaxRates",
    "tier": "financial",
    "actions": [
      {
        "id": "PATCH /tax_rates/{id}/archive",
        "name": "archive",
        "method": "PATCH",
        "path": "/tax_rates/{id}/archive",
        "summary": "Archives a tax rate",
        "requiresId": true,
        "tier": "financial"
      },
      {
        "id": "PATCH /tax_rates/{id}/restore",
        "name": "restore",
        "method": "PATCH",
        "path": "/tax_rates/{id}/restore",
        "summary": "Restores an archived tax rate",
        "requiresId": true,
        "tier": "financial"
      }
    ],
    "list": {
      "filters": [
        "id",
        "name",
        "primary_component_name",
        "primary_component_value",
        "secondary_component_name",
        "secondary_component_value",
        "status"
      ],
      "sorts": [
        "name",
        "subsidiary_name"
      ],
      "relationships": [
        "organization",
        "subsidiary"
      ]
    },
    "create": {
      "required": [
        "name",
        "subsidiary_id"
      ],
      "attributes": [
        "name",
        "primary_component_name",
        "primary_component_value",
        "secondary_component_name",
        "secondary_component_value",
        "subsidiary_id"
      ],
      "relationships": []
    },
    "get": {
      "relationships": [
        "organization",
        "subsidiary"
      ]
    },
    "update": {
      "required": [
        "name",
        "subsidiary_id"
      ],
      "attributes": [
        "name",
        "primary_component_name",
        "primary_component_value",
        "secondary_component_name",
        "secondary_component_value",
        "subsidiary_id"
      ],
      "relationships": []
    }
  },
  "team_memberships": {
    "key": "team_memberships",
    "path": "/team_memberships",
    "tag": "Team Memberships",
    "tier": "write",
    "actions": [],
    "list": {
      "filters": [
        "active",
        "id",
        "person_id",
        "team_id"
      ],
      "sorts": [
        "person_name"
      ],
      "relationships": [
        "organization",
        "person",
        "team"
      ]
    },
    "create": {
      "required": [
        "person_id",
        "team_id"
      ],
      "attributes": [
        "person_id",
        "team_id"
      ],
      "relationships": []
    },
    "get": {
      "relationships": [
        "organization",
        "person",
        "team"
      ]
    },
    "remove": true
  },
  "teams": {
    "key": "teams",
    "path": "/teams",
    "tag": "Teams",
    "tier": "write",
    "actions": [],
    "list": {
      "filters": [
        "color_id",
        "id",
        "name",
        "query"
      ],
      "sorts": [
        "name"
      ],
      "relationships": [
        "members",
        "organization"
      ]
    },
    "create": {
      "required": [
        "name"
      ],
      "attributes": [
        "color_id",
        "icon_id",
        "name"
      ],
      "relationships": []
    },
    "get": {
      "relationships": [
        "members",
        "organization"
      ]
    },
    "update": {
      "required": [
        "name"
      ],
      "attributes": [
        "color_id",
        "icon_id",
        "name"
      ],
      "relationships": []
    },
    "remove": true
  },
  "templates": {
    "key": "templates",
    "path": "/templates",
    "tag": "Templates",
    "tier": "write",
    "actions": [],
    "list": {
      "filters": [
        "id",
        "project_id",
        "query",
        "target_id",
        "target_type",
        "task_project_id"
      ],
      "sorts": [
        "created_at",
        "id",
        "project_id",
        "target_id",
        "target_type",
        "updated_at"
      ],
      "relationships": [
        "creator",
        "deal",
        "filter",
        "page",
        "project",
        "task"
      ]
    },
    "create": {
      "required": [],
      "attributes": [
        "copy_attributes",
        "description",
        "model_attributes",
        "name",
        "target_id",
        "target_type"
      ],
      "relationships": []
    },
    "get": {
      "relationships": [
        "creator",
        "deal",
        "filter",
        "page",
        "project",
        "task"
      ]
    },
    "update": {
      "required": [],
      "attributes": [
        "copy_attributes",
        "description",
        "model_attributes",
        "name",
        "target_id",
        "target_type"
      ],
      "relationships": []
    },
    "remove": true
  },
  "time_entries": {
    "key": "time_entries",
    "path": "/time_entries",
    "tag": "Time Entries",
    "tier": "write",
    "actions": [
      {
        "id": "PATCH /time_entries/{id}/approve",
        "name": "approve",
        "method": "PATCH",
        "path": "/time_entries/{id}/approve",
        "summary": "Approves a time entry",
        "requiresId": true,
        "tier": "write"
      },
      {
        "id": "PATCH /time_entries/approve",
        "name": "bulk_approve",
        "method": "PATCH",
        "path": "/time_entries/approve",
        "summary": "Approves time entries",
        "requiresId": false,
        "collectionWide": true,
        "tier": "write",
        "body": {
          "required": [],
          "attributes": [
            "billable_time",
            "calendar_event_id",
            "date",
            "jira_issue_id",
            "jira_issue_status",
            "jira_issue_summary",
            "jira_organization",
            "jira_worklog_id",
            "note",
            "person_id",
            "service_id",
            "started_at",
            "task_id",
            "time",
            "use_salary_currency"
          ],
          "relationships": [],
          "borrowedShape": true
        }
      },
      {
        "id": "DELETE /time_entries",
        "name": "bulk_delete",
        "method": "DELETE",
        "path": "/time_entries",
        "summary": "Deletes time entries",
        "requiresId": false,
        "collectionWide": true,
        "tier": "write"
      },
      {
        "id": "PATCH /time_entries/unapprove",
        "name": "bulk_unapprove",
        "method": "PATCH",
        "path": "/time_entries/unapprove",
        "summary": "Unapproves time entries",
        "requiresId": false,
        "collectionWide": true,
        "tier": "write",
        "body": {
          "required": [],
          "attributes": [
            "billable_time",
            "calendar_event_id",
            "date",
            "jira_issue_id",
            "jira_issue_status",
            "jira_issue_summary",
            "jira_organization",
            "jira_worklog_id",
            "note",
            "person_id",
            "service_id",
            "started_at",
            "task_id",
            "time",
            "use_salary_currency"
          ],
          "relationships": [],
          "borrowedShape": true
        }
      },
      {
        "id": "PATCH /time_entries",
        "name": "bulk_update",
        "method": "PATCH",
        "path": "/time_entries",
        "summary": "Update time entries",
        "requiresId": false,
        "collectionWide": true,
        "tier": "write",
        "body": {
          "required": [],
          "attributes": [
            "billable_time",
            "calendar_event_id",
            "date",
            "jira_issue_id",
            "jira_issue_status",
            "jira_issue_summary",
            "jira_organization",
            "jira_worklog_id",
            "note",
            "person_id",
            "service_id",
            "started_at",
            "task_id",
            "time",
            "use_salary_currency"
          ],
          "relationships": [],
          "borrowedShape": true
        }
      },
      {
        "id": "PATCH /time_entries/{id}/reject",
        "name": "reject",
        "method": "PATCH",
        "path": "/time_entries/{id}/reject",
        "summary": "Reject a time entry",
        "requiresId": true,
        "tier": "write"
      },
      {
        "id": "PATCH /time_entries/{id}/unapprove",
        "name": "unapprove",
        "method": "PATCH",
        "path": "/time_entries/{id}/unapprove",
        "summary": "Unapproves a time entry",
        "requiresId": true,
        "tier": "write"
      },
      {
        "id": "PATCH /time_entries/{id}/unreject",
        "name": "unreject",
        "method": "PATCH",
        "path": "/time_entries/{id}/unreject",
        "summary": "Unreject a time entry",
        "requiresId": true,
        "tier": "write"
      }
    ],
    "list": {
      "filters": [
        "after",
        "approval_policy_id",
        "approved_at",
        "approver_id",
        "assigned_approver_id",
        "autotracked",
        "awaiting_approval_from_approver_id",
        "base_cost",
        "before",
        "billable",
        "billable_time",
        "billing_type_id",
        "booking_id",
        "budget_id",
        "budget_type_id",
        "company_id",
        "cost",
        "created_after",
        "created_at",
        "created_before",
        "creator_id",
        "date",
        "deal_id",
        "deal_subsidiary_id",
        "designated_approver_id",
        "ended_at",
        "facility_overhead_cost",
        "id",
        "intercompany_hours",
        "internal_overhead_cost",
        "invoice_attribution_id",
        "invoice_id",
        "invoiced",
        "invoicing_status",
        "jira_issue_id",
        "jira_issue_status",
        "jira_issue_summary",
        "jira_worklog_id",
        "last_activity_at",
        "last_actor_id",
        "note",
        "overhead",
        "overhead_cost",
        "parent_company_id",
        "people_custom_fields",
        "person_id",
        "person_manager_id",
        "person_subsidiary_id",
        "person_tags",
        "project_id",
        "project_manager_id",
        "project_type_id",
        "query",
        "responsible_id",
        "role_id",
        "section_name",
        "service_id",
        "service_type_id",
        "stage_type",
        "started_after",
        "started_at",
        "started_before",
        "status",
        "task_id",
        "task_list_id",
        "time",
        "track_method_id",
        "unit_id",
        "updated_at"
      ],
      "sorts": [
        "date",
        "deal_name",
        "person_name",
        "service_name",
        "updated_at"
      ],
      "relationships": [
        "approval_statuses",
        "approver",
        "creator",
        "deal_subsidiary",
        "invoice_attribution",
        "last_actor",
        "organization",
        "person",
        "person_subsidiary",
        "rejecter",
        "service",
        "task",
        "timesheet",
        "updater"
      ]
    },
    "create": {
      "required": [
        "date",
        "person_id",
        "service_id",
        "time"
      ],
      "attributes": [
        "billable_time",
        "calendar_event_id",
        "date",
        "jira_issue_id",
        "jira_issue_status",
        "jira_issue_summary",
        "jira_organization",
        "jira_worklog_id",
        "note",
        "person_id",
        "service_id",
        "started_at",
        "task_id",
        "time",
        "use_salary_currency"
      ],
      "relationships": []
    },
    "get": {
      "relationships": [
        "approval_statuses",
        "approver",
        "creator",
        "deal_subsidiary",
        "invoice_attribution",
        "last_actor",
        "organization",
        "person",
        "person_subsidiary",
        "rejecter",
        "service",
        "task",
        "timesheet",
        "updater"
      ]
    },
    "update": {
      "required": [
        "date",
        "person_id",
        "service_id",
        "time"
      ],
      "attributes": [
        "billable_time",
        "calendar_event_id",
        "date",
        "jira_issue_id",
        "jira_issue_status",
        "jira_issue_summary",
        "jira_organization",
        "jira_worklog_id",
        "note",
        "person_id",
        "service_id",
        "started_at",
        "task_id",
        "time",
        "use_salary_currency"
      ],
      "relationships": []
    },
    "remove": true
  },
  "time_entry_versions": {
    "key": "time_entry_versions",
    "path": "/time_entry_versions",
    "tag": "Time Entry Versions",
    "tier": "write",
    "actions": [],
    "list": {
      "filters": [
        "created_at",
        "creator_id",
        "date",
        "deal_id",
        "event",
        "id",
        "person_id",
        "service_id",
        "time_entry_id"
      ],
      "sorts": [
        "created_at"
      ],
      "relationships": [
        "creator",
        "deal",
        "organization",
        "person",
        "service"
      ]
    },
    "get": {
      "relationships": [
        "creator",
        "deal",
        "organization",
        "person",
        "service"
      ]
    }
  },
  "time_tracking_policies": {
    "key": "time_tracking_policies",
    "path": "/time_tracking_policies",
    "tag": "Time Tracking Policies",
    "tier": "admin",
    "actions": [
      {
        "id": "PATCH /time_tracking_policies/{id}/archive",
        "name": "archive",
        "method": "PATCH",
        "path": "/time_tracking_policies/{id}/archive",
        "summary": "Archives a time tracking policy",
        "requiresId": true,
        "tier": "admin"
      },
      {
        "id": "PATCH /time_tracking_policies/{id}/restore",
        "name": "restore",
        "method": "PATCH",
        "path": "/time_tracking_policies/{id}/restore",
        "summary": "Restores an archived time tracking policy",
        "requiresId": true,
        "tier": "admin"
      }
    ],
    "list": {
      "filters": [
        "id",
        "name",
        "person_id",
        "status"
      ],
      "sorts": [
        "name"
      ],
      "relationships": [
        "creator",
        "last_actor",
        "organization"
      ]
    },
    "create": {
      "required": [],
      "attributes": [
        "disabled_tracking_message",
        "full_day_absence_limit",
        "half_day_absence_limit",
        "holiday_limit",
        "limited_tracking_message",
        "name",
        "non_working_day_limit",
        "note_mandatory",
        "restrict_time_entry_overlap",
        "working_day_limit"
      ],
      "relationships": []
    },
    "get": {
      "relationships": [
        "creator",
        "last_actor",
        "organization"
      ]
    },
    "update": {
      "required": [],
      "attributes": [
        "disabled_tracking_message",
        "full_day_absence_limit",
        "half_day_absence_limit",
        "holiday_limit",
        "limited_tracking_message",
        "name",
        "non_working_day_limit",
        "note_mandatory",
        "restrict_time_entry_overlap",
        "working_day_limit"
      ],
      "relationships": []
    },
    "remove": true
  },
  "timers": {
    "key": "timers",
    "path": "/timers",
    "tag": "Timers",
    "tier": "write",
    "actions": [
      {
        "id": "PATCH /timers/{id}/stop",
        "name": "stop",
        "method": "PATCH",
        "path": "/timers/{id}/stop",
        "summary": "Stops a timer",
        "requiresId": true,
        "tier": "write"
      }
    ],
    "list": {
      "filters": [
        "person_id",
        "started_at",
        "stopped_at",
        "time_entry_id"
      ],
      "sorts": [
        "started_at",
        "stopped_at"
      ],
      "relationships": [
        "organization",
        "time_entry"
      ]
    },
    "create": {
      "required": [],
      "attributes": [
        "person_id",
        "service_id",
        "started_at",
        "time_entry_id"
      ],
      "relationships": []
    },
    "get": {
      "relationships": [
        "organization",
        "time_entry"
      ]
    }
  },
  "timesheets": {
    "key": "timesheets",
    "path": "/timesheets",
    "tag": "Timesheets",
    "tier": "write",
    "actions": [],
    "list": {
      "filters": [
        "creator_id",
        "date",
        "person_id"
      ],
      "sorts": [
        "date",
        "id",
        "person_id"
      ],
      "relationships": [
        "creator",
        "organization",
        "person"
      ]
    },
    "create": {
      "required": [],
      "attributes": [
        "date",
        "person_id"
      ],
      "relationships": []
    },
    "get": {
      "relationships": [
        "creator",
        "organization",
        "person"
      ]
    },
    "remove": true
  },
  "todos": {
    "key": "todos",
    "path": "/todos",
    "tag": "Todos",
    "tier": "write",
    "actions": [],
    "list": {
      "filters": [
        "assignee_id",
        "deal_id",
        "due_date",
        "id",
        "status",
        "task_id",
        "todoable_type"
      ],
      "sorts": [],
      "relationships": [
        "assignee",
        "deal",
        "organization",
        "task"
      ]
    },
    "create": {
      "required": [
        "description"
      ],
      "attributes": [
        "assignee_id",
        "closed",
        "deal_id",
        "description",
        "due_date",
        "position",
        "task_id"
      ],
      "relationships": []
    },
    "get": {
      "relationships": [
        "assignee",
        "deal",
        "organization",
        "task"
      ]
    },
    "update": {
      "required": [],
      "attributes": [
        "assignee_id",
        "closed",
        "deal_id",
        "description",
        "due_date",
        "position",
        "task_id"
      ],
      "relationships": []
    },
    "remove": true
  },
  "users": {
    "key": "users",
    "path": "/users",
    "tag": "Users",
    "tier": "admin",
    "actions": [],
    "list": {
      "filters": [],
      "sorts": [],
      "relationships": []
    },
    "get": {
      "relationships": []
    },
    "update": {
      "required": [],
      "attributes": [
        "account_access_expires_at",
        "avatar_url",
        "default_organization_id",
        "email",
        "first_name",
        "ical_token",
        "last_name",
        "locale",
        "newsletter_consent",
        "preferences",
        "time_zone"
      ],
      "relationships": []
    }
  },
  "webhook_logs": {
    "key": "webhook_logs",
    "path": "/webhook_logs",
    "tag": "Webhook Logs",
    "tier": "admin",
    "actions": [],
    "list": {
      "filters": [
        "after",
        "before",
        "id",
        "retry_attempt",
        "retry_job_id",
        "webhook_id"
      ],
      "sorts": [],
      "relationships": [
        "organization",
        "webhook"
      ]
    }
  },
  "webhooks": {
    "key": "webhooks",
    "path": "/webhooks",
    "tag": "Webhooks",
    "tier": "admin",
    "actions": [],
    "list": {
      "filters": [
        "event_id",
        "id",
        "state_id",
        "type_id"
      ],
      "sorts": [],
      "relationships": [
        "creator",
        "organization"
      ]
    },
    "create": {
      "required": [
        "event_id",
        "target_url",
        "type_id"
      ],
      "attributes": [
        "custom_headers",
        "event_id",
        "name",
        "target_url",
        "type_id"
      ],
      "relationships": []
    },
    "get": {
      "relationships": [
        "creator",
        "organization"
      ]
    },
    "remove": true
  },
  "widgets": {
    "key": "widgets",
    "path": "/widgets",
    "tag": "Widgets",
    "tier": "write",
    "actions": [],
    "list": {
      "filters": [
        "dashboard_id"
      ],
      "sorts": [],
      "relationships": [
        "attachments",
        "dashboard",
        "filter",
        "organization"
      ]
    },
    "create": {
      "required": [
        "dashboard_id",
        "height",
        "widget_type_id",
        "width"
      ],
      "attributes": [
        "attachment_ids",
        "column_position",
        "content",
        "dashboard_id",
        "filter_id",
        "height",
        "row_position",
        "title",
        "widget_type_id",
        "width"
      ],
      "relationships": []
    },
    "get": {
      "relationships": [
        "attachments",
        "dashboard",
        "filter",
        "organization"
      ]
    },
    "update": {
      "required": [
        "dashboard_id",
        "height",
        "widget_type_id",
        "width"
      ],
      "attributes": [
        "attachment_ids",
        "column_position",
        "content",
        "dashboard_id",
        "filter_id",
        "height",
        "row_position",
        "title",
        "widget_type_id",
        "width"
      ],
      "relationships": []
    },
    "remove": true
  },
  "workflow_statuses": {
    "key": "workflow_statuses",
    "path": "/workflow_statuses",
    "tag": "Workflow Statuses",
    "tier": "write",
    "actions": [],
    "list": {
      "filters": [
        "category_id",
        "id",
        "name",
        "project_id",
        "query",
        "workflow_id"
      ],
      "sorts": [
        "name",
        "position"
      ],
      "relationships": [
        "organization",
        "workflow"
      ]
    },
    "create": {
      "required": [
        "category_id",
        "name",
        "workflow_id"
      ],
      "attributes": [
        "category_id",
        "color_id",
        "name",
        "position",
        "workflow_id"
      ],
      "relationships": []
    },
    "get": {
      "relationships": [
        "organization",
        "workflow"
      ]
    },
    "update": {
      "required": [
        "category_id",
        "name",
        "workflow_id"
      ],
      "attributes": [
        "category_id",
        "color_id",
        "name",
        "position",
        "workflow_id"
      ],
      "relationships": []
    },
    "remove": true
  },
  "workflows": {
    "key": "workflows",
    "path": "/workflows",
    "tag": "Workflows",
    "tier": "write",
    "actions": [
      {
        "id": "PATCH /workflows/{id}/archive",
        "name": "archive",
        "method": "PATCH",
        "path": "/workflows/{id}/archive",
        "summary": "Archives a workflow",
        "requiresId": true,
        "tier": "write"
      },
      {
        "id": "PATCH /workflows/{id}/restore",
        "name": "restore",
        "method": "PATCH",
        "path": "/workflows/{id}/restore",
        "summary": "Restores a workflow",
        "requiresId": true,
        "tier": "write"
      }
    ],
    "list": {
      "filters": [
        "archived",
        "name",
        "query"
      ],
      "sorts": [
        "name"
      ],
      "relationships": [
        "organization",
        "workflow_statuses"
      ]
    },
    "create": {
      "required": [
        "name"
      ],
      "attributes": [
        "name"
      ],
      "relationships": []
    },
    "get": {
      "relationships": [
        "organization",
        "workflow_statuses"
      ]
    },
    "update": {
      "required": [
        "name"
      ],
      "attributes": [
        "name"
      ],
      "relationships": []
    },
    "remove": true
  }
};
