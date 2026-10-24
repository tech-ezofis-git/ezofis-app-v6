import type { MessageDescriptor } from '@lingui/core'
import { msg } from '@lingui/core/macro'

/**
 * Copy for the "page guide" info banner (InfoCard) shown at the top of
 * builders and setup wizards: a task-style heading plus what to do on that
 * page or step. Keyed by step so each step explains itself.
 */
export type PageGuide = {
  description: MessageDescriptor
  title: MessageDescriptor
}

export const FOLDER_SETUP_GUIDES: Record<number, PageGuide> = {
  1: {
    description: msg`Give the folder a clear name and a short description so people know which documents belong here. The name appears in Folders, search results, and workflow attachments.`,
    title: msg`Name and describe your folder`,
  },
  2: {
    description: msg`Add the metadata fields captured for every document, such as invoice number, vendor, or date. Mark a field as required when a document should not be saved without it.`,
    title: msg`Define the document fields`,
  },
  3: {
    description: msg`Choose where the files are stored. Use the built-in secure storage, or connect a cloud provider such as OneDrive or Google Drive to keep documents in your own account.`,
    title: msg`Choose a storage location`,
  },
  4: {
    description: msg`Decide what happens when a file with the same name is uploaded again: replace the existing file, keep each version with a timestamp, or number versions automatically.`,
    title: msg`Set the versioning strategy`,
  },
  5: {
    description: msg`Pick the personal or sensitive values to mask in document previews, such as account numbers or IDs. Users without permission see the masked value only.`,
    title: msg`Protect sensitive data`,
  },
  6: {
    description: msg`Optionally connect this folder to an ERP or external system and map its fields, so documents and their metadata stay in sync automatically.`,
    title: msg`Connect integrations`,
  },
}

export const USER_SETUP_GUIDES: Record<string, PageGuide> = {
  authentication: {
    description: msg`Choose how this user signs in and whether extra verification, such as multi-factor authentication, is required.`,
    title: msg`Set sign-in security`,
  },
  business: {
    description: msg`Add the user's department, job title, manager, and location. These details drive approvals, routing, and reports.`,
    title: msg`Add business details`,
  },
  groups: {
    description: msg`Add the user to groups. Groups decide which folders, workflows, and tasks the user can see and act on.`,
    title: msg`Assign access groups`,
  },
  login: {
    description: msg`Enter the user's name, email, and role. The email is used to sign in and to receive notifications.`,
    title: msg`Create the user's login`,
  },
  review: {
    description: msg`Check the user's details, groups, and security settings. Go back to any step to change something, then save the user.`,
    title: msg`Review and save the user`,
  },
}

export const GROUP_SETUP_GUIDES: Record<string, PageGuide> = {
  details: {
    description: msg`Name the group after a team or responsibility, such as "Finance Approvers", and describe who belongs in it.`,
    title: msg`Name your group`,
  },
  members: {
    description: msg`Select the users who belong to this group. Everyone in the group gets the access and tasks assigned to it.`,
    title: msg`Add group members`,
  },
  review: {
    description: msg`Check the group name and its members, then save. You can edit the group later as your team changes.`,
    title: msg`Review and save the group`,
  },
}

export const MENU_SETUP_GUIDES: Record<string, PageGuide> = {
  details: {
    description: msg`Enter a unique menu key and the label people see in the navigation. The key cannot be changed after the menu is saved.`,
    title: msg`Name the menu item`,
  },
  review: {
    description: msg`Check the menu key, label, route, and order, then save to add it to the navigation.`,
    title: msg`Review and save the menu`,
  },
  route: {
    description: msg`Set the page this menu item opens and its position in the navigation. Lower sort numbers appear first.`,
    title: msg`Set the route and order`,
  },
}

export const PORTAL_SETUP_GUIDES: Record<string, PageGuide> = {
  authentication: {
    description: msg`Choose how external users sign in to the portal: application sign-in, a master form login, or email with a one-time code. You can also allow Google or Microsoft sign-in.`,
    title: msg`Choose how users sign in`,
  },
  details: {
    description: msg`Give the portal a name and description. External users see this name when they open the portal.`,
    title: msg`Name your portal`,
  },
  review: {
    description: msg`Check the portal details, sign-in method, and connected workflows, then save to publish the portal.`,
    title: msg`Review and save the portal`,
  },
  workflows: {
    description: msg`Select the workflows people can start and track from this portal. Each workflow appears as a request type in the portal.`,
    title: msg`Connect workflows`,
  },
}

export const ROLE_SETUP_GUIDES: Record<string, PageGuide> = {
  details: {
    description: msg`Name the role and select the users who should have it. A role bundles the permissions a set of people need.`,
    title: msg`Name the role and assign users`,
  },
  permissions: {
    description: msg`Turn on the modules and actions this role can use, such as viewing, creating, editing, or deleting. Leave anything off that the role should not access.`,
    title: msg`Set the role's permissions`,
  },
  review: {
    description: msg`Check the role's users and permissions, then save. Changes apply the next time those users load the app.`,
    title: msg`Review and save the role`,
  },
}

export const BRANDING_GUIDES: Record<string, PageGuide> = {
  assets: {
    description: msg`Upload your organization's logo and favicon. The logo appears in the app header and portals; the favicon appears in the browser tab.`,
    title: msg`Add your logo and favicon`,
  },
  identity: {
    description: msg`Set your brand name and primary colors. The preview shows how buttons, links, and highlights will look across the app.`,
    title: msg`Set your brand name and colors`,
  },
}

export const REPORT_BUILDER_GUIDES: Record<string, PageGuide> = {
  details: {
    description: msg`Name the report, describe what it shows, and choose who it is shared with.`,
    title: msg`Name and share the report`,
  },
  fields: {
    description: msg`Pick the columns to include and arrange them in the order they should appear in the report.`,
    title: msg`Choose the report columns`,
  },
  filters: {
    description: msg`Add filters to keep only the rows that matter, such as a date range, a status, or a department.`,
    title: msg`Filter the report data`,
  },
  schedule: {
    description: msg`Optionally deliver the report automatically. Choose how often it runs and who receives it by email.`,
    title: msg`Schedule report delivery`,
  },
  source: {
    description: msg`Choose whether the report reads from a workflow or a folder, then pick which one. The fields you can add depend on this source.`,
    title: msg`Choose the data source`,
  },
}

export const DOCUMENT_SECURITY_RULE_GUIDES: Record<number, PageGuide> = {
  0: {
    description: msg`Add the conditions that decide which documents this rule covers, such as a field value or document type, then choose the security action to apply.`,
    title: msg`Define the document rule`,
  },
  1: {
    description: msg`Select the users or groups this rule applies to. Only the people you choose are affected by the rule.`,
    title: msg`Choose who the rule applies to`,
  },
  2: {
    description: msg`Check the conditions, action, and target users, then save the rule. You can go back to any step before saving.`,
    title: msg`Review and save the rule`,
  },
}

export const FOLDER_SECURITY_POLICY_GUIDES: Record<number, PageGuide> = {
  0: {
    description: msg`Select the users and groups this policy controls. Everyone you add gets the permissions set in the next step.`,
    title: msg`Choose users and groups`,
  },
  1: {
    description: msg`Turn on the actions they can perform in this folder, such as view, upload, download, edit, or delete.`,
    title: msg`Set folder permissions`,
  },
  2: {
    description: msg`Check who has access and what they can do, then save the policy.`,
    title: msg`Review and save the policy`,
  },
}

export const RETENTION_POLICY_GUIDES: Record<number, PageGuide> = {
  0: {
    description: msg`Name the retention policy and describe which documents it is for, so other admins understand its purpose.`,
    title: msg`Name your retention policy`,
  },
  1: {
    description: msg`Choose the trigger field that starts the retention period, add any extra conditions, and pick the action to run on matching documents.`,
    title: msg`Define the retention rule`,
  },
  2: {
    description: msg`Check the policy details and rule, then apply it. The policy runs on matching documents in this folder from now on.`,
    title: msg`Review and apply the policy`,
  },
}

export const FORM_WIZARD_GUIDES: Record<string, PageGuide> = {
  '1': {
    description: msg`Choose how to start: build the form from scratch, start from a template, or describe it and let AI create the first draft.`,
    title: msg`Choose how to start your form`,
  },
  '1A': {
    description: msg`Give the form a name, a short description, and a type. The name is what people see when they open or submit the form.`,
    title: msg`Name your form`,
  },
  '1B': {
    description: msg`Pick a layout for the form. You can add, move, and edit fields in the form builder after it is created.`,
    title: msg`Choose a form layout`,
  },
  '3': {
    description: msg`Describe the form you need in plain words, or pick a sample prompt. AI creates the fields, which you can review and edit in the builder.`,
    title: msg`Create your form with AI`,
  },
}

export const WORKFLOW_AI_BUILDER_GUIDE: PageGuide = {
  description: msg`Describe the process you want to automate, such as who submits, who approves, and what happens next. AI drafts the workflow steps, which you can review and edit on the canvas. Prefer to start empty? Choose Build Manually.`,
  title: msg`Create a workflow`,
}

export const DASHBOARD_BUILDER_GUIDES: Record<number, PageGuide> = {
  1: {
    description: msg`AI drafts a description of what this dashboard should show from the folder or workflow data. Edit it in your own words, or select Regenerate, then continue to the designer.`,
    title: msg`Describe your dashboard`,
  },
  2: {
    description: msg`AI suggests KPIs and charts from your data. Keep the ones you need, then select Apply & Preview to build the dashboard.`,
    title: msg`Pick KPIs and charts`,
  },
  3: {
    description: msg`Check the live dashboard built from your selections. Go back to the designer to change widgets, or select Save Dashboard when it looks right.`,
    title: msg`Preview and save the dashboard`,
  },
}

export const AI_FORM_BUILDER_GUIDES: Record<'describe' | 'type', PageGuide> = {
  describe: {
    description: msg`Describe the form in plain words, such as its purpose and the fields it needs, or pick a sample prompt. AI builds the form, which you can then edit in the form builder.`,
    title: msg`Describe your form`,
  },
  type: {
    description: msg`Choose Workflow Form to collect data inside a workflow, or Master Form to keep reference data such as vendors or customers. Prefer to start empty? Choose Build Manually.`,
    title: msg`Choose the form type`,
  },
}

export const AI_FOLDER_BUILDER_GUIDES: Record<number, PageGuide> = {
  1: {
    description: msg`Enter a folder name. AI drafts a business description from it, which you can edit before you continue.`,
    title: msg`Name your folder`,
  },
  2: {
    description: msg`AI suggests metadata fields for the documents in this folder. Keep, edit, or add fields, and mark the ones that must be filled.`,
    title: msg`Review the suggested fields`,
  },
  3: {
    description: msg`Choose where the documents are stored: the built-in secure storage, or a connected cloud provider such as OneDrive or Google Drive.`,
    title: msg`Choose a storage location`,
  },
  4: {
    description: msg`Decide what happens when a file with the same name is uploaded again: replace it, keep each version with a timestamp, or number versions automatically.`,
    title: msg`Set the versioning strategy`,
  },
  5: {
    description: msg`Optionally connect an ERP or other system so documents and their data stay in sync with this folder. You can skip this and add it later.`,
    title: msg`Connect integrations`,
  },
  6: {
    description: msg`Check every stage of the folder setup. Select a stage to change it, then select Save Folder to create the folder.`,
    title: msg`Review and save the folder`,
  },
}

export const UPLOAD_GUIDE: PageGuide = {
  description: msg`Drop files or browse to upload them to this folder. Each file is read automatically, then you check the extracted fields, fill in any required ones, and save the document.`,
  title: msg`Upload and index documents`,
}
