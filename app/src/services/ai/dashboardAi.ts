import { GoogleGenAI, Type } from '@google/genai'

const API_KEY = import.meta.env.VITE_GEMINI_API_KEY

let aiClient: GoogleGenAI | null = null

const getAiClient = () => {
  if (!API_KEY) {
    throw new Error('Gemini API Key is missing')
  }
  if (!aiClient) {
    aiClient = new GoogleGenAI({ apiKey: API_KEY })
  }
  return aiClient
}

export interface DashboardAiConfig {
  description: string
  repositoryName: string
  sections: DashboardSectionGroup[]
  source: 'gemini' | 'local'
}

export interface DashboardChartPoint {
  [key: string]: any
  name: string
  value: number
  amount?: string
  profitMargin?: number
}

export type DashboardComponentType =
  | 'header'
  | 'kpi_grid'
  | 'insights'
  | 'pie_chart'
  | 'bar_chart'
  | 'area_chart'
  | 'spend_tiles'
  | 'table'

export interface DashboardInsightItem {
  id: string
  text: string
  enabled?: boolean
}

export interface DashboardKpiItem {
  id: string
  subtext: string
  title: string
  value: string
  enabled?: boolean
  isPositive?: boolean
  trend?: string
}

export interface DashboardSectionGroup {
  components: DashboardWidgetComponent[]
  enabled: boolean
  id: string
  subtitle: string
  summaryBadges: DashboardSummaryBadge[]
  title: string
  isExpanded?: boolean
}

export interface DashboardSummaryBadge {
  label: string
  value: string
  color?: string
}

export interface DashboardTableRow {
  amount: string
  category: string
  date: string
  id: string
  status: 'Approved' | 'Pending' | 'Review' | 'Completed'
  title: string
}

export interface DashboardWidgetComponent {
  id: string
  type: DashboardComponentType
  data?: any
  enabled?: boolean
  insights?: DashboardInsightItem[]
  kpis?: DashboardKpiItem[]
  subtitle?: string
  summaryBadges?: DashboardSummaryBadge[]
  title?: string
}

/** Fallback generator producing clean sections formatted with component schema */
export function buildFallbackDashboardConfig(
  repositoryName: string,
  description: string,
): DashboardAiConfig {
  const cleanName = repositoryName.trim()

  const rawConfig: any = {
    description: description || buildFallbackDescription(cleanName),
    repositoryName: cleanName,
    sections: [
      {
        enabled: true,
        id: generateUniqueId('sec_cmd'),
        insights: [
          {
            enabled: true,
            id: generateUniqueId('ins'),
            text: `100% of critical ${cleanName} records are structurally validated and indexed.`,
          },
          {
            enabled: true,
            id: generateUniqueId('ins'),
            text: `Vendor risk exposure is 100% concentrated within primary service providers.`,
          },
          {
            enabled: true,
            id: generateUniqueId('ins'),
            text: `All open items are within SLA thresholds, representing 0 overdue escalations.`,
          },
          {
            enabled: true,
            id: generateUniqueId('ins'),
            text: `Total repository volume has increased by 14.2% month-over-month.`,
          },
        ],
        isExpanded: true,
        kpis: [
          {
            enabled: true,
            id: generateUniqueId('kpi'),
            isPositive: false,
            subtext: 'vs last month',
            title: 'TOTAL OUTSTANDING',
            trend: '-97.1%',
            value: '$485.2K',
          },
          {
            enabled: true,
            id: generateUniqueId('kpi'),
            isPositive: true,
            subtext: 'vs last month',
            title: 'TOTAL PAID',
            trend: '+14.2%',
            value: '$124.0K',
          },
          {
            enabled: true,
            id: generateUniqueId('kpi'),
            isPositive: false,
            subtext: 'vs last month',
            title: 'PENDING PAYMENTS',
            trend: '-10.5%',
            value: '$42.1K',
          },
          {
            enabled: true,
            id: generateUniqueId('kpi'),
            isPositive: true,
            subtext: 'vs last month',
            title: 'DUE TODAY',
            trend: '0%',
            value: '$12.5K',
          },
          {
            enabled: true,
            id: generateUniqueId('kpi'),
            isPositive: false,
            subtext: 'vs last month',
            title: 'OVERDUE',
            trend: '-96.8%',
            value: '$29.6K',
          },
          {
            enabled: true,
            id: generateUniqueId('kpi'),
            isPositive: true,
            subtext: 'vs last month',
            title: 'AVG. PROCESSING TIME',
            trend: '-40.7%',
            value: '1.8 d',
          },
        ],
        riskData: [
          { amount: '$340K', name: 'Low Risk / Normal', value: 70 },
          { amount: '$97K', name: 'Medium Risk', value: 20 },
          { amount: '$48K', name: 'High Risk / Review', value: 10 },
        ],
        subtitle: `Real-time · month · all repository records`,
        summaryBadges: [
          { label: 'TOTAL VOLUME', value: '$485.2K' },
          { color: 'text-red-9', label: 'OVERDUE', value: '$42.1K' },
          { label: 'OPEN ITEMS', value: '18' },
          { label: 'DPO', value: '4d' },
        ],
        title: `${cleanName} Command Center`,
      },
      {
        cashFlowForecastData: [
          { name: 'W1', value: 12000 },
          { name: 'W2', value: 18000 },
          { name: 'W3', value: 45000 },
          { name: 'W4', value: 22000 },
          { name: 'W5', value: 15000 },
          { name: 'W6', value: 31000 },
          { name: 'W7', value: 24000 },
          { name: 'W8', value: 19000 },
          { name: 'W9', value: 28000 },
          { name: 'W10', value: 16000 },
        ],
        enabled: true,
        id: generateUniqueId('sec_profit'),
        isExpanded: true,
        monthlyPaymentTrendData: [
          { name: 'Jan', value: 28000 },
          { name: 'Feb', value: 39000 },
          { name: 'Mar', value: 52000 },
          { name: 'Apr', value: 46000 },
          { name: 'May', value: 61000 },
          { name: 'Jun', value: 78000 },
        ],
        profitVsSpendData: [
          { name: 'Jan 2026', profitMargin: 24, value: 32000 },
          { name: 'Feb 2026', profitMargin: 22, value: 45000 },
          { name: 'Mar 2026', profitMargin: 20, value: 58000 },
          { name: 'Apr 2026', profitMargin: 19, value: 51000 },
          { name: 'May 2026', profitMargin: 18, value: 69000 },
          { name: 'Jun 2026', profitMargin: 18.4, value: 84000 },
        ],
        subtitle: 'Volume growth eating margin · future liquidity needs',
        summaryBadges: [
          { color: 'text-green-9', label: 'PROFIT MARGIN', value: '18.4%' },
          { label: 'NEXT 4 WEEKS', value: '$142.5K' },
          { label: 'PEAK WEEK', value: 'Week 3' },
        ],
        title: 'Profitability & Cash Position',
      },
      {
        departmentSpendData: [
          { amount: '$203.7K', name: 'Operations', value: 42 },
          { amount: '$135.8K', name: 'Finance', value: 28 },
          { amount: '$87.3K', name: 'Legal & HR', value: 18 },
          { amount: '$58.2K', name: 'Technology', value: 12 },
        ],
        enabled: true,
        id: generateUniqueId('sec_risk'),
        isExpanded: true,
        outstandingPayablesData: [
          { amount: '$397K', name: 'Current (< 30 days)', value: 82 },
          { amount: '$58K', name: 'Overdue (30-60 days)', value: 12 },
          { amount: '$29K', name: 'Critical (> 60 days)', value: 6 },
        ],
        subtitle: 'Where spend concentrates · vendor risk exposure',
        summaryBadges: [
          { label: 'ACTIVE SUPPLIERS', value: '14' },
          { color: 'text-red-9', label: 'HIGH RISK', value: '1' },
          {
            color: 'text-primary-9',
            label: 'TOP-3 CONCENTRATION',
            value: '78.5%',
          },
        ],
        title: 'Supplier Concentration & Risk',
        topSuppliersData: [
          { amount: '$218K', name: 'Anthropic, PBC', value: 45 },
          { amount: '$106K', name: 'Global Logistics Co', value: 22 },
          { amount: '$87K', name: 'Apex Enterprise Software', value: 18 },
          { amount: '$74K', name: 'Others', value: 15 },
        ],
      },
      {
        approvalDaysData: [
          { name: 'Legal', value: 4.8 },
          { name: 'Finance', value: 2.1 },
          { name: 'Operations', value: 1.5 },
          { name: 'IT', value: 1.2 },
        ],
        enabled: true,
        id: generateUniqueId('sec_pipeline'),
        isExpanded: true,
        subtitle: 'Pipeline throughput efficiency and approval metrics',
        summaryBadges: [
          { label: 'AVG APPROVAL DAYS', value: '2.4d' },
          { color: 'text-green-9', label: 'APPROVAL RATE', value: '96.2%' },
          { label: 'CRITICAL', value: '0' },
        ],
        tableData: [
          {
            amount: '$12,450.00',
            category: 'Operations',
            date: '2026-08-09',
            id: generateUniqueId('rec'),
            status: 'Approved',
            title: `${cleanName} Entry #1001`,
          },
          {
            amount: '$8,200.00',
            category: 'Finance',
            date: '2026-08-09',
            id: generateUniqueId('rec'),
            status: 'Pending',
            title: `${cleanName} Entry #1002`,
          },
          {
            amount: '$24,100.00',
            category: 'Technology',
            date: '2026-08-08',
            id: generateUniqueId('rec'),
            status: 'Approved',
            title: `${cleanName} Entry #1003`,
          },
          {
            amount: '$5,750.00',
            category: 'Legal & HR',
            date: '2026-08-07',
            id: generateUniqueId('rec'),
            status: 'Review',
            title: `${cleanName} Entry #1004`,
          },
          {
            amount: '$15,900.00',
            category: 'Operations',
            date: '2026-08-06',
            id: generateUniqueId('rec'),
            status: 'Completed',
            title: `${cleanName} Entry #1005`,
          },
        ],
        title: 'Aging & Process Oversight',
      },
    ],
    source: 'local',
  }

  return normalizeDashboardConfig(rawConfig)
}

/** Generates detailed collapsible dashboard sections using Gemini AI or fallback */
export async function generateDashboardConfigViaGemini(
  repositoryName: string,
  description: string,
  userPrompt?: string,
): Promise<DashboardAiConfig> {
  if (!API_KEY) {
    return buildFallbackDashboardConfig(repositoryName, description)
  }

  try {
    const client = getAiClient()
    const response = await client.models.generateContent({
      config: {
        responseMimeType: 'application/json',
        responseSchema: {
          properties: {
            description: { type: Type.STRING },
            sections: {
              items: {
                properties: {
                  enabled: { type: Type.BOOLEAN },
                  id: { type: Type.STRING },
                  insights: {
                    items: {
                      properties: {
                        id: { type: Type.STRING },
                        text: { type: Type.STRING },
                      },
                      required: ['id', 'text'],
                      type: Type.OBJECT,
                    },
                    type: Type.ARRAY,
                  },
                  kpis: {
                    items: {
                      properties: {
                        id: { type: Type.STRING },
                        isPositive: { type: Type.BOOLEAN },
                        subtext: { type: Type.STRING },
                        title: { type: Type.STRING },
                        trend: { type: Type.STRING },
                        value: { type: Type.STRING },
                      },
                      required: ['id', 'title', 'value', 'subtext'],
                      type: Type.OBJECT,
                    },
                    type: Type.ARRAY,
                  },
                  subtitle: { type: Type.STRING },
                  summaryBadges: {
                    items: {
                      properties: {
                        color: { type: Type.STRING },
                        label: { type: Type.STRING },
                        value: { type: Type.STRING },
                      },
                      required: ['label', 'value'],
                      type: Type.OBJECT,
                    },
                    type: Type.ARRAY,
                  },
                  tableData: {
                    items: {
                      properties: {
                        amount: { type: Type.STRING },
                        category: { type: Type.STRING },
                        date: { type: Type.STRING },
                        id: { type: Type.STRING },
                        status: { type: Type.STRING },
                        title: { type: Type.STRING },
                      },
                      required: ['id', 'title', 'amount', 'status'],
                      type: Type.OBJECT,
                    },
                    type: Type.ARRAY,
                  },
                  title: { type: Type.STRING },
                },
                required: [
                  'id',
                  'title',
                  'subtitle',
                  'enabled',
                  'summaryBadges',
                ],
                type: Type.OBJECT,
              },
              type: Type.ARRAY,
            },
          },
          required: ['description', 'sections'],
          type: Type.OBJECT,
        },
      },
      contents: [
        {
          parts: [
            {
              text: `Generate 4 collapsible dashboard sections for repository "${repositoryName}".
Description: "${description}".
User Custom Preferences: "${userPrompt || 'Create standard key performance metrics, cash flow trends, risk radar, and activity table.'}".

Include 4 sections:
1. Command Center (with 6 KPIs, AI Insights, Risk Donut data)
2. Profitability & Cash Position (with dual axis profit vs spend, monthly payment trend, 10-week forecast)
3. Supplier Concentration & Risk (with top vendor donut data, department spend allocation)
4. Aging & Operations Pipeline (with approval days by department and recent activity data table)`,
            },
          ],
          role: 'user',
        },
      ],
      model: 'gemini-2.5-flash-lite',
    })

    const parsed = JSON.parse(response.text || '{}')
    if (Array.isArray(parsed.sections) && parsed.sections.length > 0) {
      const fallback = buildFallbackDashboardConfig(repositoryName, description)
      const merged: DashboardAiConfig = {
        description: parsed.description || description,
        repositoryName,
        sections: fallback.sections.map((sec, idx) => {
          const aiSec = parsed.sections[idx]
          if (!aiSec) return sec

          // Safely merge AI-generated legacy data into the modern components array
          const components = (sec.components || []).map((comp) => {
            if (comp.type === 'kpi_grid' && aiSec.kpis)
              return { ...comp, kpis: aiSec.kpis }
            if (comp.type === 'insights' && aiSec.insights)
              return { ...comp, insights: aiSec.insights }
            if (comp.type === 'table' && aiSec.tableData)
              return { ...comp, data: aiSec.tableData }
            if (
              comp.type === 'pie_chart' &&
              comp.title?.includes('Risk') &&
              aiSec.riskData
            )
              return { ...comp, data: aiSec.riskData }
            if (
              comp.type === 'bar_chart' &&
              comp.title?.includes('Profit') &&
              aiSec.profitVsSpendData
            )
              return { ...comp, data: aiSec.profitVsSpendData }
            if (
              comp.type === 'area_chart' &&
              comp.title?.includes('payment') &&
              aiSec.monthlyPaymentTrendData
            )
              return { ...comp, data: aiSec.monthlyPaymentTrendData }
            if (
              comp.type === 'bar_chart' &&
              comp.title?.includes('forecast') &&
              aiSec.cashFlowForecastData
            )
              return { ...comp, data: aiSec.cashFlowForecastData }
            if (
              comp.type === 'pie_chart' &&
              comp.title?.includes('Top suppliers') &&
              aiSec.topSuppliersData
            )
              return { ...comp, data: aiSec.topSuppliersData }
            if (
              comp.type === 'pie_chart' &&
              comp.title?.includes('payables') &&
              aiSec.outstandingPayablesData
            )
              return { ...comp, data: aiSec.outstandingPayablesData }
            if (comp.type === 'spend_tiles' && aiSec.departmentSpendData)
              return { ...comp, data: aiSec.departmentSpendData }
            if (
              comp.type === 'bar_chart' &&
              comp.title?.includes('Approval') &&
              aiSec.approvalDaysData
            )
              return { ...comp, data: aiSec.approvalDaysData }
            return comp
          })

          return {
            ...sec,
            components,
            enabled: aiSec.enabled ?? true,
            subtitle: aiSec.subtitle || sec.subtitle,
            summaryBadges: aiSec.summaryBadges || sec.summaryBadges,
            title: aiSec.title || sec.title,
          }
        }),
        source: 'gemini',
      }
      return normalizeDashboardConfig(merged)
    }
  } catch (err) {
    console.warn('Gemini dashboard generation fallback:', err)
  }

  return buildFallbackDashboardConfig(repositoryName, description)
}

/** Generates a smart description based on repository name */
export async function generateRepositoryDescription(
  repoName: string,
): Promise<string> {
  if (!API_KEY) {
    return buildFallbackDescription(repoName)
  }

  try {
    const client = getAiClient()
    const response = await client.models.generateContent({
      contents: [
        {
          parts: [
            {
              text: `Write a clear 1-2 sentence business description for a document repository named "${repoName}". Explain its primary function and what metrics or analytics should be tracked in its dashboard.`,
            },
          ],
          role: 'user',
        },
      ],
      model: 'gemini-2.5-flash-lite',
    })

    const text = response.text?.trim()
    return text || buildFallbackDescription(repoName)
  } catch (err) {
    console.warn('Gemini description generation fallback:', err)
    return buildFallbackDescription(repoName)
  }
}

export function generateUniqueId(prefix = 'id'): string {
  if (
    typeof crypto !== 'undefined' &&
    typeof crypto.randomUUID === 'function'
  ) {
    return `${prefix}_${crypto.randomUUID().slice(0, 8)}`
  }
  return `${prefix}_${Math.random().toString(36).slice(2, 10)}`
}

/** Converts any config into a clean, normalized schema stripping legacy keys & auto-generating unique IDs */
export function normalizeDashboardConfig(
  config: DashboardAiConfig,
): DashboardAiConfig {
  if (!config || !Array.isArray(config.sections)) return config

  const normalizedSections = config.sections.map((sec) => {
    const sectionId =
      sec.id && !sec.id.includes(' ') ? sec.id : generateUniqueId('sec')
    const comps: DashboardWidgetComponent[] = []

    // If components array is already present, sanitize and clean it up completely
    if (Array.isArray(sec.components) && sec.components.length > 0) {
      const cleanedComps = sec.components.map((c) => ({
        data: c.data,
        enabled: c.enabled !== false,
        id: c.id || generateUniqueId(`comp_${c.type || 'widget'}`),
        insights: c.insights?.map((ins) => ({
          ...ins,
          enabled: ins.enabled !== false,
          id: ins.id || generateUniqueId('ins'),
        })),
        kpis: c.kpis?.map((k) => ({
          ...k,
          enabled: k.enabled !== false,
          id: k.id || generateUniqueId('kpi'),
        })),
        subtitle: c.subtitle,
        summaryBadges: c.summaryBadges,
        title: c.title,
        type: c.type,
      }))

      return {
        components: cleanedComps,
        enabled: sec.enabled !== false,
        id: sectionId,
        isExpanded: sec.isExpanded !== false,
        subtitle: sec.subtitle,
        summaryBadges: sec.summaryBadges || [],
        title: sec.title,
      }
    }

    // Convert legacy raw properties into clean components array
    const raw = sec as any
    const hiddenWidgets = raw.hiddenWidgets || []

    comps.push({
      enabled: sec.enabled !== false,
      id: generateUniqueId('hdr'),
      subtitle: sec.subtitle,
      summaryBadges: sec.summaryBadges || [],
      title: sec.title,
      type: 'header',
    })

    if (Array.isArray(raw.kpis) && raw.kpis.length > 0) {
      comps.push({
        enabled: !hiddenWidgets.includes('kpis'),
        id: generateUniqueId('kpi_grid'),
        kpis: raw.kpis.map((k: any) => ({
          ...k,
          enabled: k.enabled !== false,
          id: k.id || generateUniqueId('kpi'),
        })),
        title: 'Key Performance Indicators',
        type: 'kpi_grid',
      })
    }

    if (Array.isArray(raw.insights) && raw.insights.length > 0) {
      comps.push({
        enabled: !hiddenWidgets.includes('insights'),
        id: generateUniqueId('insights'),
        insights: raw.insights.map((ins: any) => ({
          ...ins,
          enabled: ins.enabled !== false,
          id: ins.id || generateUniqueId('ins'),
        })),
        subtitle: 'Auto-updates with your filters — the ledger margin notes',
        title: 'AI-generated insights',
        type: 'insights',
      })
    }

    if (Array.isArray(raw.riskData) && raw.riskData.length > 0) {
      comps.push({
        data: raw.riskData,
        enabled:
          !hiddenWidgets.includes('risk_radar') &&
          !hiddenWidgets.includes('riskData'),
        id: generateUniqueId('pie_risk'),
        subtitle: 'Which vendors carry the most risk exposure?',
        title: 'Supplier Risk Radar',
        type: 'pie_chart',
      })
    }

    if (
      Array.isArray(raw.profitVsSpendData) &&
      raw.profitVsSpendData.length > 0
    ) {
      comps.push({
        data: raw.profitVsSpendData,
        enabled:
          !hiddenWidgets.includes('profit_spend') &&
          !hiddenWidgets.includes('profitVsSpendData'),
        id: generateUniqueId('bar_profit_spend'),
        subtitle: 'Dual axis: Amount and profit efficiency %',
        title: 'Profit vs Spending',
        type: 'bar_chart',
      })
    }

    if (
      Array.isArray(raw.monthlyPaymentTrendData) &&
      raw.monthlyPaymentTrendData.length > 0
    ) {
      comps.push({
        data: raw.monthlyPaymentTrendData,
        enabled:
          !hiddenWidgets.includes('payment_trend') &&
          !hiddenWidgets.includes('monthlyPaymentTrendData'),
        id: generateUniqueId('area_payment_trend'),
        subtitle: 'Cash leaving the building, month by month',
        title: 'Monthly payment trend',
        type: 'area_chart',
      })
    }

    if (
      Array.isArray(raw.cashFlowForecastData) &&
      raw.cashFlowForecastData.length > 0
    ) {
      comps.push({
        data: raw.cashFlowForecastData,
        enabled:
          !hiddenWidgets.includes('cash_forecast') &&
          !hiddenWidgets.includes('cashFlowForecastData'),
        id: generateUniqueId('bar_cash_forecast'),
        subtitle: 'Liquidity projection and cash needs over next 10 weeks',
        title: 'Cash flow forecast',
        type: 'bar_chart',
      })
    }

    if (
      Array.isArray(raw.topSuppliersData) &&
      raw.topSuppliersData.length > 0
    ) {
      comps.push({
        data: raw.topSuppliersData,
        enabled:
          !hiddenWidgets.includes('top_suppliers') &&
          !hiddenWidgets.includes('topSuppliersData'),
        id: generateUniqueId('pie_top_suppliers'),
        subtitle: 'Concentration of liabilities',
        title: 'Top suppliers by value',
        type: 'pie_chart',
      })
    }

    if (
      Array.isArray(raw.outstandingPayablesData) &&
      raw.outstandingPayablesData.length > 0
    ) {
      comps.push({
        data: raw.outstandingPayablesData,
        enabled:
          !hiddenWidgets.includes('outstanding_payables') &&
          !hiddenWidgets.includes('outstandingPayablesData'),
        id: generateUniqueId('pie_payables'),
        subtitle: 'Click supplier to drill down',
        title: 'Outstanding payables',
        type: 'pie_chart',
      })
    }

    if (
      Array.isArray(raw.departmentSpendData) &&
      raw.departmentSpendData.length > 0
    ) {
      comps.push({
        data: raw.departmentSpendData,
        enabled:
          !hiddenWidgets.includes('dept_spend') &&
          !hiddenWidgets.includes('departmentSpendData'),
        id: generateUniqueId('tiles_dept_spend'),
        subtitle: 'Tile size reflects share of expenses',
        title: 'Department-wise spend',
        type: 'spend_tiles',
      })
    }

    if (
      Array.isArray(raw.approvalDaysData) &&
      raw.approvalDaysData.length > 0
    ) {
      comps.push({
        data: raw.approvalDaysData,
        enabled:
          !hiddenWidgets.includes('approval_days') &&
          !hiddenWidgets.includes('approvalDaysData'),
        id: generateUniqueId('bar_approval_days'),
        subtitle: 'Average days to approve by department · last 8 weeks',
        title: 'Approval Days by Department',
        type: 'bar_chart',
      })
    }

    if (Array.isArray(raw.tableData) && raw.tableData.length > 0) {
      comps.push({
        data: raw.tableData,
        enabled:
          !hiddenWidgets.includes('activity_table') &&
          !hiddenWidgets.includes('tableData'),
        id: generateUniqueId('tbl_activity_table'),
        subtitle: 'Live indexed documents and approval status',
        title: 'Recent Repository Ingested Records',
        type: 'table',
      })
    }

    // Return clean section object WITHOUT old legacy keys!
    return {
      components: comps,
      enabled: sec.enabled !== false,
      id: sectionId,
      isExpanded: sec.isExpanded !== false,
      subtitle: sec.subtitle,
      summaryBadges: sec.summaryBadges || [],
      title: sec.title,
    }
  })

  return {
    description: config.description,
    repositoryName: config.repositoryName,
    sections: normalizedSections,
    source: config.source || 'local',
  }
}

function buildFallbackDescription(repoName: string): string {
  const name = repoName.trim()
  if (/account/i.test(name)) {
    return `Central repository for ledger accounting, financial statement management, and real-time transaction reporting.`
  }
  if (/order/i.test(name) || /pay/i.test(name)) {
    return `Procurement and order-to-cash hub tracking purchase requisitions, vendor payables, and order fulfillment cycles.`
  }
  if (/legal|contract/i.test(name)) {
    return `Legal contract vault for tracking vendor agreements, SLA compliance dates, and risk exposures.`
  }
  if (/hr|employee|payroll/i.test(name)) {
    return `Human resources repository managing employee records, payroll disbursements, and department budget allocations.`
  }
  return `Automated document repository for "${name}" managing record lifecycle, compliance tracking, and operational analytics.`
}
