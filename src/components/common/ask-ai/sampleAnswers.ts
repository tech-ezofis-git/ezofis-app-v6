import type { AskAiAnswer } from './types'

/**
 * Sample chatbot responses used as docs / offline fallbacks.
 * Shapes match http://52.172.32.88:7071/api/chatbot
 */

/** From another page → open repository + apply filters (click to go). */
export const sampleRepositoryRedirectAnswer: AskAiAnswer = {
  conversationId: 'sample-repo-redirect-001',
  text: {
    blocks: [
      {
        type: 'paragraph',
        text: 'I found matching invoices for supplier ACME in Accounts Payable.',
      },
      {
        type: 'paragraph',
        text: 'Open the repository to review these documents with the filters applied.',
      },
      {
        type: 'bullets',
        title: 'Filters Tried',
        variant: 'dot',
        items: [
          { label: 'Supplier', value: 'ACME' },
          { label: 'InvoiceNo', value: 'INVOICES' },
        ],
      },
    ],
  },
  actionTo: 'Repository',
  actionContext: {
    workspaceId: '0',
    repositoryId: 'F1138FE5-DDFA-4DAF-8562-11FA4E989F23',
  },
  action: {
    browse_request: {
      repositoryId: 'F1138FE5-DDFA-4DAF-8562-11FA4E989F23',
      parentNodeId: 0,
      sortBy: { criteria: '', order: 'ASC' },
      groupBy: '',
      filterBy: [
        {
          id: 'g1',
          groupCondition: '',
          filters: [
            {
              id: 'f1',
              criteria: 'Supplier',
              criteriaArray: ['Supplier'],
              condition: 'IS_EQUALS_TO',
              value: '["ACME"]',
              arrayValue: ['ACME'],
              dataType: 'SHORT_TEXT',
            },
          ],
        },
        {
          id: 'g2',
          groupCondition: 'AND',
          filters: [
            {
              id: 'f2',
              criteria: 'InvoiceNo',
              criteriaArray: ['InvoiceNo'],
              condition: 'IS_EQUALS_TO',
              value: '["INVOICES"]',
              arrayValue: ['INVOICES'],
              dataType: 'SHORT_TEXT',
            },
          ],
        },
      ],
      currentPage: 1,
      itemsPerPage: 100,
      mode: 'BROWSE',
      level: 0,
      contentSearchValue: '',
      fuzzy: 8,
      searchType: 1,
    },
  },
}

/** Already on the same repository → apply a different filter (click to apply). */
export const sampleRepositoryApplyFilterAnswer: AskAiAnswer = {
  conversationId: 'sample-repo-apply-002',
  text: {
    blocks: [
      {
        type: 'paragraph',
        text: 'I updated the search filters for this repository.',
      },
      {
        type: 'paragraph',
        text: 'Click below to apply PO Number = PO-1001 on the current folder.',
      },
      {
        type: 'bullets',
        title: 'Filters Tried',
        variant: 'dot',
        items: [{ label: 'PONumber', value: 'PO-1001' }],
      },
    ],
  },
  actionTo: 'Repository',
  actionContext: {
    workspaceId: '0',
    repositoryId: 'F1138FE5-DDFA-4DAF-8562-11FA4E989F23',
  },
  action: {
    browse_request: {
      repositoryId: 'F1138FE5-DDFA-4DAF-8562-11FA4E989F23',
      parentNodeId: 0,
      sortBy: { criteria: '', order: 'ASC' },
      groupBy: '',
      filterBy: [
        {
          id: 'g1',
          groupCondition: '',
          filters: [
            {
              id: 'f1',
              criteria: 'PONumber',
              criteriaArray: ['PONumber'],
              condition: 'IS_EQUALS_TO',
              value: '["PO-1001"]',
              arrayValue: ['PO-1001'],
              dataType: 'SHORT_TEXT',
            },
          ],
        },
      ],
      currentPage: 1,
      itemsPerPage: 100,
      mode: 'BROWSE',
      level: 0,
      contentSearchValue: '',
      fuzzy: 8,
      searchType: 1,
    },
  },
}

/** From another page → open workflows list with filters. */
export const sampleWorkflowRedirectAnswer: AskAiAnswer = {
  conversationId: 'sample-workflow-redirect-003',
  text: {
    blocks: [
      {
        type: 'paragraph',
        text: 'I found published AP workflows matching your search.',
      },
      {
        type: 'paragraph',
        text: 'Open Workflows to review them with these filters applied.',
      },
      {
        type: 'bullets',
        title: 'Filters Tried',
        variant: 'dot',
        items: [
          { label: 'flowStatus', value: 'PUBLISHED' },
          { label: 'name', value: 'Invoice' },
        ],
      },
    ],
  },
  actionTo: 'Workflow',
  actionContext: {
    workspaceId: '0',
    workflowId: '',
  },
  action: {
    browse_request: {
      filterBy: [
        {
          id: 'g1',
          groupCondition: '',
          filters: [
            {
              id: 'f1',
              criteria: 'flowStatus',
              criteriaArray: ['flowStatus'],
              condition: 'IS_EQUALS_TO',
              value: '["PUBLISHED"]',
              arrayValue: ['PUBLISHED'],
              dataType: 'SHORT_TEXT',
            },
          ],
        },
        {
          id: 'g2',
          groupCondition: 'AND',
          filters: [
            {
              id: 'f2',
              criteria: 'name',
              criteriaArray: ['name'],
              condition: 'CONTAINS',
              value: '["Invoice"]',
              arrayValue: ['Invoice'],
              dataType: 'SHORT_TEXT',
            },
          ],
        },
      ],
      currentPage: 1,
      itemsPerPage: 100,
      mode: 'BROWSE',
      sortBy: { criteria: 'name', order: 'ASC' },
    },
  },
}

/** Already on workflows → apply filter only. */
export const sampleWorkflowApplyFilterAnswer: AskAiAnswer = {
  conversationId: 'sample-workflow-apply-004',
  text: {
    blocks: [
      {
        type: 'paragraph',
        text: 'I prepared a status filter for the workflows list.',
      },
      {
        type: 'paragraph',
        text: 'Click below to apply Status = Draft on this page.',
      },
      {
        type: 'bullets',
        title: 'Filters Tried',
        variant: 'dot',
        items: [{ label: 'flowStatus', value: 'Draft' }],
      },
    ],
  },
  actionTo: 'Workflow',
  actionContext: {
    workspaceId: '0',
  },
  action: {
    browse_request: {
      filterBy: [
        {
          id: 'g1',
          groupCondition: '',
          filters: [
            {
              id: 'f1',
              criteria: 'flowStatus',
              criteriaArray: ['flowStatus'],
              condition: 'IS_EQUALS_TO',
              value: '["Draft"]',
              arrayValue: ['Draft'],
              dataType: 'SHORT_TEXT',
            },
          ],
        },
      ],
      currentPage: 1,
      itemsPerPage: 100,
      mode: 'BROWSE',
    },
  },
}

/** No redirect — text only (e.g. no matches). */
export const sampleNoActionAnswer: AskAiAnswer = {
  conversationId: 'sample-no-action-005',
  text: {
    blocks: [
      {
        type: 'paragraph',
        text: 'I tried these filters, but found no matching documents.',
      },
      {
        type: 'paragraph',
        text: 'No invoices were found for supplier ACME. You may want to rephrase your question.',
      },
      {
        type: 'bullets',
        title: 'Filters Tried',
        variant: 'dot',
        items: [
          { label: 'PONumber', value: 'ACME' },
          { label: 'InvoiceNo', value: 'INVOICES' },
          { label: 'Supplier', value: 'ACME' },
        ],
      },
    ],
  },
  actionTo: 'Repository',
  actionContext: {
    workspaceId: '0',
    repositoryId: 'F1138FE5-DDFA-4DAF-8562-11FA4E989F23',
  },
  action: {
    browse_request: {
      repositoryId: 'F1138FE5-DDFA-4DAF-8562-11FA4E989F23',
      parentNodeId: 0,
      sortBy: { criteria: '', order: 'ASC' },
      groupBy: '',
      filterBy: [
        {
          id: 'POozQibB4afnJAnxYvvZD',
          groupCondition: '',
          filters: [
            {
              id: 'jymr38rAB0-yR-0JGlLkO',
              criteria: 'PONumber',
              criteriaArray: ['PONumber'],
              condition: 'IS_EQUALS_TO',
              value: '["ACME"]',
              arrayValue: ['ACME'],
              dataType: 'SHORT_TEXT',
            },
          ],
        },
        {
          id: '9jorlzIRKWWp5zvs_8AUO',
          groupCondition: 'AND',
          filters: [
            {
              id: 'wQtROOKAmvm5LuRCu_szb',
              criteria: 'InvoiceNo',
              criteriaArray: ['InvoiceNo'],
              condition: 'IS_EQUALS_TO',
              value: '["INVOICES"]',
              arrayValue: ['INVOICES'],
              dataType: 'SHORT_TEXT',
            },
          ],
        },
        {
          id: 'ERHAl9UwvKUUUE1MhjlHL',
          groupCondition: 'AND',
          filters: [
            {
              id: 'IvWHbWr48kQbXmmM2povm',
              criteria: 'Supplier',
              criteriaArray: ['Supplier'],
              condition: 'IS_EQUALS_TO',
              value: '["ACME"]',
              arrayValue: ['ACME'],
              dataType: 'SHORT_TEXT',
            },
          ],
        },
      ],
      currentPage: 1,
      itemsPerPage: 100,
      mode: 'BROWSE',
      level: 0,
      contentSearchValue: '',
      fuzzy: 8,
      searchType: 1,
    },
  },
}
