import type { AskAiAnswer } from './types'

/**
 * Sample chatbot responses used as docs / offline fallbacks.
 
 */

/** From another page → open repository + apply filters (click to go). */
export const sampleRepositoryRedirectAnswer: AskAiAnswer = {
  action: {
    browse_request: {
      contentSearchValue: '',
      currentPage: 1,
      filterBy: [
        {
          filters: [
            {
              arrayValue: ['ACME'],
              condition: 'IS_EQUALS_TO',
              criteria: 'Supplier',
              criteriaArray: ['Supplier'],
              dataType: 'SHORT_TEXT',
              id: 'f1',
              value: '["ACME"]',
            },
          ],
          groupCondition: '',
          id: 'g1',
        },
        {
          filters: [
            {
              arrayValue: ['INVOICES'],
              condition: 'IS_EQUALS_TO',
              criteria: 'InvoiceNo',
              criteriaArray: ['InvoiceNo'],
              dataType: 'SHORT_TEXT',
              id: 'f2',
              value: '["INVOICES"]',
            },
          ],
          groupCondition: 'AND',
          id: 'g2',
        },
      ],
      fuzzy: 8,
      groupBy: '',
      itemsPerPage: 100,
      level: 0,
      mode: 'BROWSE',
      parentNodeId: 0,
      repositoryId: 'F1138FE5-DDFA-4DAF-8562-11FA4E989F23',
      searchType: 1,
      sortBy: { criteria: '', order: 'ASC' },
    },
  },
  actionContext: {
    repositoryId: 'F1138FE5-DDFA-4DAF-8562-11FA4E989F23',
    workspaceId: '0',
  },
  actionTo: 'Repository',
  conversationId: 'sample-repo-redirect-001',
  text: {
    blocks: [
      {
        text: 'I found matching invoices for supplier ACME in Accounts Payable.',
        type: 'paragraph',
      },
      {
        text: 'Open the repository to review these documents with the filters applied.',
        type: 'paragraph',
      },
      {
        items: [
          { label: 'Supplier', value: 'ACME' },
          { label: 'InvoiceNo', value: 'INVOICES' },
        ],
        title: 'Filters Tried',
        type: 'bullets',
        variant: 'dot',
      },
    ],
  },
}

/** Already on the same repository → apply a different filter (click to apply). */
export const sampleRepositoryApplyFilterAnswer: AskAiAnswer = {
  action: {
    browse_request: {
      contentSearchValue: '',
      currentPage: 1,
      filterBy: [
        {
          filters: [
            {
              arrayValue: ['PO-1001'],
              condition: 'IS_EQUALS_TO',
              criteria: 'PONumber',
              criteriaArray: ['PONumber'],
              dataType: 'SHORT_TEXT',
              id: 'f1',
              value: '["PO-1001"]',
            },
          ],
          groupCondition: '',
          id: 'g1',
        },
      ],
      fuzzy: 8,
      groupBy: '',
      itemsPerPage: 100,
      level: 0,
      mode: 'BROWSE',
      parentNodeId: 0,
      repositoryId: 'F1138FE5-DDFA-4DAF-8562-11FA4E989F23',
      searchType: 1,
      sortBy: { criteria: '', order: 'ASC' },
    },
  },
  actionContext: {
    repositoryId: 'F1138FE5-DDFA-4DAF-8562-11FA4E989F23',
    workspaceId: '0',
  },
  actionTo: 'Repository',
  conversationId: 'sample-repo-apply-002',
  text: {
    blocks: [
      {
        text: 'I updated the search filters for this repository.',
        type: 'paragraph',
      },
      {
        text: 'Click below to apply PO Number = PO-1001 on the current folder.',
        type: 'paragraph',
      },
      {
        items: [{ label: 'PONumber', value: 'PO-1001' }],
        title: 'Filters Tried',
        type: 'bullets',
        variant: 'dot',
      },
    ],
  },
}

/** From another page → open workflows list with filters. */
export const sampleWorkflowRedirectAnswer: AskAiAnswer = {
  action: {
    browse_request: {
      currentPage: 1,
      filterBy: [
        {
          filters: [
            {
              arrayValue: ['PUBLISHED'],
              condition: 'IS_EQUALS_TO',
              criteria: 'flowStatus',
              criteriaArray: ['flowStatus'],
              dataType: 'SHORT_TEXT',
              id: 'f1',
              value: '["PUBLISHED"]',
            },
          ],
          groupCondition: '',
          id: 'g1',
        },
        {
          filters: [
            {
              arrayValue: ['Invoice'],
              condition: 'CONTAINS',
              criteria: 'name',
              criteriaArray: ['name'],
              dataType: 'SHORT_TEXT',
              id: 'f2',
              value: '["Invoice"]',
            },
          ],
          groupCondition: 'AND',
          id: 'g2',
        },
      ],
      itemsPerPage: 100,
      mode: 'BROWSE',
      sortBy: { criteria: 'name', order: 'ASC' },
    },
  },
  actionContext: {
    workflowId: '',
    workspaceId: '0',
  },
  actionTo: 'Workflow',
  conversationId: 'sample-workflow-redirect-003',
  text: {
    blocks: [
      {
        text: 'I found published AP workflows matching your search.',
        type: 'paragraph',
      },
      {
        text: 'Open Workflows to review them with these filters applied.',
        type: 'paragraph',
      },
      {
        items: [
          { label: 'flowStatus', value: 'PUBLISHED' },
          { label: 'name', value: 'Invoice' },
        ],
        title: 'Filters Tried',
        type: 'bullets',
        variant: 'dot',
      },
    ],
  },
}

/** Already on workflows → apply filter only. */
export const sampleWorkflowApplyFilterAnswer: AskAiAnswer = {
  action: {
    browse_request: {
      currentPage: 1,
      filterBy: [
        {
          filters: [
            {
              arrayValue: ['Draft'],
              condition: 'IS_EQUALS_TO',
              criteria: 'flowStatus',
              criteriaArray: ['flowStatus'],
              dataType: 'SHORT_TEXT',
              id: 'f1',
              value: '["Draft"]',
            },
          ],
          groupCondition: '',
          id: 'g1',
        },
      ],
      itemsPerPage: 100,
      mode: 'BROWSE',
    },
  },
  actionContext: {
    workspaceId: '0',
  },
  actionTo: 'Workflow',
  conversationId: 'sample-workflow-apply-004',
  text: {
    blocks: [
      {
        text: 'I prepared a status filter for the workflows list.',
        type: 'paragraph',
      },
      {
        text: 'Click below to apply Status = Draft on this page.',
        type: 'paragraph',
      },
      {
        items: [{ label: 'flowStatus', value: 'Draft' }],
        title: 'Filters Tried',
        type: 'bullets',
        variant: 'dot',
      },
    ],
  },
}

/** No redirect — text only (e.g. no matches). */
export const sampleNoActionAnswer: AskAiAnswer = {
  action: {
    browse_request: {
      contentSearchValue: '',
      currentPage: 1,
      filterBy: [
        {
          filters: [
            {
              arrayValue: ['ACME'],
              condition: 'IS_EQUALS_TO',
              criteria: 'PONumber',
              criteriaArray: ['PONumber'],
              dataType: 'SHORT_TEXT',
              id: 'jymr38rAB0-yR-0JGlLkO',
              value: '["ACME"]',
            },
          ],
          groupCondition: '',
          id: 'POozQibB4afnJAnxYvvZD',
        },
        {
          filters: [
            {
              arrayValue: ['INVOICES'],
              condition: 'IS_EQUALS_TO',
              criteria: 'InvoiceNo',
              criteriaArray: ['InvoiceNo'],
              dataType: 'SHORT_TEXT',
              id: 'wQtROOKAmvm5LuRCu_szb',
              value: '["INVOICES"]',
            },
          ],
          groupCondition: 'AND',
          id: '9jorlzIRKWWp5zvs_8AUO',
        },
        {
          filters: [
            {
              arrayValue: ['ACME'],
              condition: 'IS_EQUALS_TO',
              criteria: 'Supplier',
              criteriaArray: ['Supplier'],
              dataType: 'SHORT_TEXT',
              id: 'IvWHbWr48kQbXmmM2povm',
              value: '["ACME"]',
            },
          ],
          groupCondition: 'AND',
          id: 'ERHAl9UwvKUUUE1MhjlHL',
        },
      ],
      fuzzy: 8,
      groupBy: '',
      itemsPerPage: 100,
      level: 0,
      mode: 'BROWSE',
      parentNodeId: 0,
      repositoryId: 'F1138FE5-DDFA-4DAF-8562-11FA4E989F23',
      searchType: 1,
      sortBy: { criteria: '', order: 'ASC' },
    },
  },
  actionContext: {
    repositoryId: 'F1138FE5-DDFA-4DAF-8562-11FA4E989F23',
    workspaceId: '0',
  },
  actionTo: 'Repository',
  conversationId: 'sample-no-action-005',
  text: {
    blocks: [
      {
        text: 'I tried these filters, but found no matching documents.',
        type: 'paragraph',
      },
      {
        text: 'No invoices were found for supplier ACME. You may want to rephrase your question.',
        type: 'paragraph',
      },
      {
        items: [
          { label: 'PONumber', value: 'ACME' },
          { label: 'InvoiceNo', value: 'INVOICES' },
          { label: 'Supplier', value: 'ACME' },
        ],
        title: 'Filters Tried',
        type: 'bullets',
        variant: 'dot',
      },
    ],
  },
}
