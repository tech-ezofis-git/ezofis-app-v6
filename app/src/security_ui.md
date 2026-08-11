
# Folder & Document Security Module

## Objective

Provide a centralized security system that allows administrators to control access to folders and documents through configurable permission policies.

The solution should:

* Follow enterprise security standards
* Be scalable (future permissions can be added)
* Be easy to understand
* Reduce configuration complexity
* Maintain complete auditability
* Support compliance requirements

---

# Module Structure

```
Security
│
├── Folder Security
│
└── Document Security
```

Each module controls permissions independently.

---

# 1. Folder Security

## Purpose

Grant users or groups permission to perform actions inside a selected folder.

The permissions automatically apply to everything inside the folder unless overridden.

---

## Configuration Flow

### Step 1

Select Folder

```
Folder

Finance
 ├── 2026
 ├── Invoices
 └── Purchase Orders
```

Administrator chooses the folder.

---

### Step 2

Select Users / Groups

Support:

* Individual Users
* User Groups
* Departments
* Roles (future)

Example

```
Finance Team

Accounts Payable

John

Sarah

Managers
```

Multiple selections allowed.

---

### Step 3

Assign Permissions

Current permissions

| Permission         | Description              |
| ------------------ | ------------------------ |
| View               | Can open folder/files    |
| Upload             | Upload new files         |
| Download           | Download documents       |
| Print              | Print documents          |
| Delete File/Folder | Delete items             |
| Edit Metadata      | Modify metadata          |
| Edit Document      | Modify document content  |
| Check Out          | Lock document            |
| Check In           | Complete editing         |
| Send for Signature | Create signature request |

Future permissions can be added without redesign.

For example

```
Move

Copy

Share

Archive

Restore

Version Delete

Workflow Approve
```

---

### Step 4

Save Policy

Example

```
Folder

Finance/Invoices

Users

Finance Team

Permissions

✓ View

✓ Upload

✓ Download

✓ Print

✓ Check In

✓ Check Out

✓ Metadata Edit
```

---

# Permission Model

Instead of storing permissions individually,

Store them as a Permission Set.

Example

```
Finance Editor

View

Upload

Download

Metadata Edit

Document Edit

Check In

Check Out
```

Benefits

* Reusable
* Easy maintenance
* Cleaner UI

---

# 2. Document Security

Folder security controls everything.

Document Security overrides only specific documents.

---

## Purpose

Grant permissions only when document metadata matches defined conditions.

Example

```
Invoice Type = Confidential
```

Only selected users can access those files.

---

## Configuration Flow

### Step 1

Select Folder

```
Finance
```

---

### Step 2

Define Condition

The document fields should be loaded dynamically.

Example fields

```
Invoice Type

Department

Vendor

Amount

Status

Country

Category

Project
```

---

### Step 3

Build Rule

Support operators

| Operator     |
| ------------ |
| Equals       |
| Not Equals   |
| Contains     |
| Starts With  |
| Ends With    |
| Greater Than |
| Less Than    |
| Between      |
| Is Empty     |
| Is Not Empty |

Example

```
Department

Equals

Finance
```

or

```
Amount

>

10000
```

or

```
Invoice Type

Contains

Confidential
```

---

### Step 4

Assign Users

```
Managers

Finance Head

John
```

---

### Step 5

Assign Permissions

Exactly the same permission list as Folder Security.

```
✓ View

✓ Download

✓ Print
```

---

### Step 6

Save Rule

Example

```
IF

Department = Finance

AND

Invoice Type = Confidential

THEN

Managers

Can

View

Download

Print
```

---

# Rule Builder

Support multiple conditions.

Example

```
Department = Finance

AND

Amount > 5000

AND

Country = USA
```

Future support

```
AND

OR

Nested Groups

Parentheses

NOT
```

Similar to Jira Automation or Power Automate.

---

# Permission Evaluation

System evaluates permissions in this order:

```
User Login

↓

Folder Permission

↓

Document Rule

↓

Final Permission
```

Document rules override folder permissions only when applicable.

---

# Security Hierarchy

```
Role

↓

User Group

↓

Folder Permission

↓

Document Rule

↓

Effective Permission
```

This keeps access predictable and manageable.

---

# UI Layout Recommendation

## Left Panel

```
Security

Folder Security

Document Security
```

---

## Folder Security Screen

```
Select Folder

↓

Assigned Users

↓

Permission Matrix

↓

Summary

↓

Save
```

---

## Document Security Screen

```
Select Folder

↓

Rule Builder

↓

User Selection

↓

Permission Matrix

↓

Rule Summary

↓

Save
```

---

# Permission Matrix UI

Instead of a long vertical list, use a permission matrix.

| Permission        | Allow |
| ----------------- | ----- |
| View              | ✓     |
| Upload            | ✓     |
| Download          | ✓     |
| Print             | ✓     |
| Delete            | □     |
| Metadata Edit     | ✓     |
| Document Edit     | ✓     |
| Check In          | ✓     |
| Check Out         | ✓     |
| Signature Request | □     |

This is cleaner and easier to scan.

---

# Compliance Considerations

For enterprise compliance, include:

* **Inheritance**: Folder permissions should inherit to subfolders by default, with an option to break inheritance.
* **Least Privilege**: Users receive only the permissions explicitly granted.
* **Audit Trail**: Record who created, modified, or removed security policies and when.
* **Permission Preview**: Show the effective permissions a selected user or group will receive before saving.
* **Conflict Resolution**: Clearly define how overlapping permissions are resolved (for example, explicit deny overrides allow, or document rules override inherited folder permissions).
* **Versioning**: Track changes to security policies so previous configurations can be reviewed or restored.
* **Scalability**: Design the permission framework to support additional actions without requiring UI redesign.

---

# Recommended Implementation Flow

```text
Security
│
├── Folder Security
│     ├── Select Folder
│     ├── Select Users / Groups
│     ├── Assign Permissions
│     ├── Review Summary
│     └── Save Policy
│
└── Document Security
      ├── Select Folder
      ├── Build Metadata Conditions
      ├── Select Users / Groups
      ├── Assign Permissions
      ├── Review Rule Summary
      └── Save Rule
```

This approach aligns with common enterprise DMS practices while remaining scalable, maintainable, and suitable for compliance-focused environments. It also leaves room for future enhancements such as role-based access control (RBAC), time-based permissions, approval workflows, and advanced rule expressions without requiring significant changes to the user interface.
