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

export function generateUniqueId(prefix = 'id'): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return `${prefix}_${crypto.randomUUID().slice(0, 8)}`
  }
  return `${prefix}_${Math.random().toString(36).slice(2, 10)}`
}

export interface DashboardKpiItem {
  id: string
  title: string
  value: string
  subtext: string
  trend?: string
  isPositive?: boolean
  enabled?: boolean
}

export interface DashboardChartPoint {
  name: string
  value: number
  amount?: string
  profitMargin?: number
  [key: string]: any
}

export interface DashboardInsightItem {
  id: string
  text: string
  enabled?: boolean
}

export interface DashboardTableRow {
  id: string
  title: string
  category: string
  amount: string
  status: 'Approved' | 'Pending' | 'Review' | 'Completed'
  date: string
}

export interface DashboardSummaryBadge {
  label: string
  value: string
  color?: string
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

export interface DashboardWidgetComponent {
  id: string
  type: DashboardComponentType
  title?: string
  subtitle?: string
  enabled?: boolean
  summaryBadges?: DashboardSummaryBadge[]
  kpis?: DashboardKpiItem[]
  insights?: DashboardInsightItem[]
  data?: any
}

export interface DashboardSectionGroup {
  id: string
  title: string
  subtitle: string
  summaryBadges: DashboardSummaryBadge[]
  enabled: boolean
  isExpanded?: boolean
  components: DashboardWidgetComponent[]
}

export interface DashboardAiConfig {
  repositoryName: string
  description: string
  sections: DashboardSectionGroup[]
  source: 'gemini' | 'local'
}

/** Converts any config into a clean, normalized schema stripping legacy keys & auto-generating unique IDs */
export function normalizeDashboardConfig(config: DashboardAiConfig): DashboardAiConfig {
  if (!config || !Array.isArray(config.sections)) return config

  const normalizedSections = config.sections.map((sec) => {
    const sectionId = sec.id && !sec.id.includes(' ') ? sec.id : generateUniqueId('sec')
    const comps: DashboardWidgetComponent[] = []

    // If components array is already present, sanitize and clean it up completely
    if (Array.isArray(sec.components) && sec.components.length > 0) {
      const cleanedComps = sec.components.map((c) => ({
        id: c.id || generateUniqueId(`comp_${c.type || 'widget'}`),
        type: c.type,
        title: c.title,
        subtitle: c.subtitle,
        enabled: c.enabled !== false,
        summaryBadges: c.summaryBadges,
        kpis: c.kpis?.map((k) => ({
          ...k,
          id: k.id || generateUniqueId('kpi'),
          enabled: k.enabled !== false,
        })),
        insights: c.insights?.map((ins) => ({
          ...ins,
          id: ins.id || generateUniqueId('ins'),
          enabled: ins.enabled !== false,
        })),
        data: c.data,
      }))

      return {
        id: sectionId,
        title: sec.title,
        subtitle: sec.subtitle,
        isExpanded: sec.isExpanded !== false,
        enabled: sec.enabled !== false,
        summaryBadges: sec.summaryBadges || [],
        components: cleanedComps,
      }
    }

    // Convert legacy raw properties into clean components array
    const raw = sec as any
    const hiddenWidgets = raw.hiddenWidgets || []

    comps.push({
      id: generateUniqueId('hdr'),
      type: 'header',
      title: sec.title,
      subtitle: sec.subtitle,
      summaryBadges: sec.summaryBadges || [],
      enabled: sec.enabled !== false,
    })

    if (Array.isArray(raw.kpis) && raw.kpis.length > 0) {
      comps.push({
        id: generateUniqueId('kpi_grid'),
        type: 'kpi_grid',
        title: 'Key Performance Indicators',
        enabled: !hiddenWidgets.includes('kpis'),
        kpis: raw.kpis.map((k: any) => ({
          ...k,
          id: k.id || generateUniqueId('kpi'),
          enabled: k.enabled !== false,
        })),
      })
    }

    if (Array.isArray(raw.insights) && raw.insights.length > 0) {
      comps.push({
        id: generateUniqueId('insights'),
        type: 'insights',
        title: 'AI-generated insights',
        subtitle: 'Auto-updates with your filters — the ledger margin notes',
        enabled: !hiddenWidgets.includes('insights'),
        insights: raw.insights.map((ins: any) => ({
          ...ins,
          id: ins.id || generateUniqueId('ins'),
          enabled: ins.enabled !== false,
        })),
      })
    }

    if (Array.isArray(raw.riskData) && raw.riskData.length > 0) {
      comps.push({
        id: generateUniqueId('pie_risk'),
        type: 'pie_chart',
        title: 'Supplier Risk Radar',
        subtitle: 'Which vendors carry the most risk exposure?',
        enabled: !hiddenWidgets.includes('risk_radar') && !hiddenWidgets.includes('riskData'),
        data: raw.riskData,
      })
    }

    if (Array.isArray(raw.profitVsSpendData) && raw.profitVsSpendData.length > 0) {
      comps.push({
        id: generateUniqueId('bar_profit_spend'),
        type: 'bar_chart',
        title: 'Profit vs Spending',
        subtitle: 'Dual axis: Amount and profit efficiency %',
        enabled: !hiddenWidgets.includes('profit_spend') && !hiddenWidgets.includes('profitVsSpendData'),
        data: raw.profitVsSpendData,
      })
    }

    if (Array.isArray(raw.monthlyPaymentTrendData) && raw.monthlyPaymentTrendData.length > 0) {
      comps.push({
        id: generateUniqueId('area_payment_trend'),
        type: 'area_chart',
        title: 'Monthly payment trend',
        subtitle: 'Cash leaving the building, month by month',
        enabled: !hiddenWidgets.includes('payment_trend') && !hiddenWidgets.includes('monthlyPaymentTrendData'),
        data: raw.monthlyPaymentTrendData,
      })
    }

    if (Array.isArray(raw.cashFlowForecastData) && raw.cashFlowForecastData.length > 0) {
      comps.push({
        id: generateUniqueId('bar_cash_forecast'),
        type: 'bar_chart',
        title: 'Cash flow forecast',
        subtitle: 'Liquidity projection and cash needs over next 10 weeks',
        enabled: !hiddenWidgets.includes('cash_forecast') && !hiddenWidgets.includes('cashFlowForecastData'),
        data: raw.cashFlowForecastData,
      })
    }

    if (Array.isArray(raw.topSuppliersData) && raw.topSuppliersData.length > 0) {
      comps.push({
        id: generateUniqueId('pie_top_suppliers'),
        type: 'pie_chart',
        title: 'Top suppliers by value',
        subtitle: 'Concentration of liabilities',
        enabled: !hiddenWidgets.includes('top_suppliers') && !hiddenWidgets.includes('topSuppliersData'),
        data: raw.topSuppliersData,
      })
    }

    if (Array.isArray(raw.outstandingPayablesData) && raw.outstandingPayablesData.length > 0) {
      comps.push({
        id: generateUniqueId('pie_payables'),
        type: 'pie_chart',
        title: 'Outstanding payables',
        subtitle: 'Click supplier to drill down',
        enabled: !hiddenWidgets.includes('outstanding_payables') && !hiddenWidgets.includes('outstandingPayablesData'),
        data: raw.outstandingPayablesData,
      })
    }

    if (Array.isArray(raw.departmentSpendData) && raw.departmentSpendData.length > 0) {
      comps.push({
        id: generateUniqueId('tiles_dept_spend'),
        type: 'spend_tiles',
        title: 'Department-wise spend',
        subtitle: 'Tile size reflects share of expenses',
        enabled: !hiddenWidgets.includes('dept_spend') && !hiddenWidgets.includes('departmentSpendData'),
        data: raw.departmentSpendData,
      })
    }

    if (Array.isArray(raw.approvalDaysData) && raw.approvalDaysData.length > 0) {
      comps.push({
        id: generateUniqueId('bar_approval_days'),
        type: 'bar_chart',
        title: 'Approval Days by Department',
        subtitle: 'Average days to approve by department · last 8 weeks',
        enabled: !hiddenWidgets.includes('approval_days') && !hiddenWidgets.includes('approvalDaysData'),
        data: raw.approvalDaysData,
      })
    }

    if (Array.isArray(raw.tableData) && raw.tableData.length > 0) {
      comps.push({
        id: generateUniqueId('tbl_activity_table'),
        type: 'table',
        title: 'Recent Repository Ingested Records',
        subtitle: 'Live indexed documents and approval status',
        enabled: !hiddenWidgets.includes('activity_table') && !hiddenWidgets.includes('tableData'),
        data: raw.tableData,
      })
    }

    // Return clean section object WITHOUT old legacy keys!
    return {
      id: sectionId,
      title: sec.title,
      subtitle: sec.subtitle,
      isExpanded: sec.isExpanded !== false,
      enabled: sec.enabled !== false,
      summaryBadges: sec.summaryBadges || [],
      components: comps,
    }
  })

  return {
    repositoryName: config.repositoryName,
    description: config.description,
    source: config.source || 'local',
    sections: normalizedSections,
  }
}

/** Generates a smart description based on repository name */
export async function generateRepositoryDescription(repoName: string): Promise<string> {
  if (!API_KEY) {
    return buildFallbackDescription(repoName)
  }

  try {
    const client = getAiClient()
    const response = await client.models.generateContent({
      model: 'gemini-2.5-flash-lite',
      contents: [
        {
          role: 'user',
          parts: [
            {
              text: `Write a clear 1-2 sentence business description for a document repository named "${repoName}". Explain its primary function and what metrics or analytics should be tracked in its dashboard.`,
            },
          ],
        },
      ],
    })

    const text = response.text?.trim()
    return text || buildFallbackDescription(repoName)
  } catch (err) {
    console.warn('Gemini description generation fallback:', err)
    return buildFallbackDescription(repoName)
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
      model: 'gemini-2.5-flash-lite',
      config: {
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            description: { type: Type.STRING },
            sections: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  id: { type: Type.STRING },
                  title: { type: Type.STRING },
                  subtitle: { type: Type.STRING },
                  enabled: { type: Type.BOOLEAN },
                  summaryBadges: {
                    type: Type.ARRAY,
                    items: {
                      type: Type.OBJECT,
                      properties: {
                        label: { type: Type.STRING },
                        value: { type: Type.STRING },
                        color: { type: Type.STRING },
                      },
                      required: ['label', 'value'],
                    },
                  },
                  kpis: {
                    type: Type.ARRAY,
                    items: {
                      type: Type.OBJECT,
                      properties: {
                        id: { type: Type.STRING },
                        title: { type: Type.STRING },
                        value: { type: Type.STRING },
                        subtext: { type: Type.STRING },
                        trend: { type: Type.STRING },
                        isPositive: { type: Type.BOOLEAN },
                      },
                      required: ['id', 'title', 'value', 'subtext'],
                    },
                  },
                  insights: {
                    type: Type.ARRAY,
                    items: {
                      type: Type.OBJECT,
                      properties: {
                        id: { type: Type.STRING },
                        text: { type: Type.STRING },
                      },
                      required: ['id', 'text'],
                    },
                  },
                  tableData: {
                    type: Type.ARRAY,
                    items: {
                      type: Type.OBJECT,
                      properties: {
                        id: { type: Type.STRING },
                        title: { type: Type.STRING },
                        category: { type: Type.STRING },
                        amount: { type: Type.STRING },
                        status: { type: Type.STRING },
                        date: { type: Type.STRING },
                      },
                      required: ['id', 'title', 'amount', 'status'],
                    },
                  },
                },
                required: ['id', 'title', 'subtitle', 'enabled', 'summaryBadges'],
              },
            },
          },
          required: ['description', 'sections'],
        },
      },
      contents: [
        {
          role: 'user',
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
        },
      ],
    })

    const parsed = JSON.parse(response.text || '{}')
    if (Array.isArray(parsed.sections) && parsed.sections.length > 0) {
      const fallback = buildFallbackDashboardConfig(repositoryName, description)
      const merged: DashboardAiConfig = {
        repositoryName,
        description: parsed.description || description,
        source: 'gemini',
        sections: fallback.sections.map((sec, idx) => {
          const aiSec = parsed.sections[idx]
          if (!aiSec) return sec

          // Safely merge AI-generated legacy data into the modern components array
          const components = (sec.components || []).map(comp => {
            if (comp.type === 'kpi_grid' && aiSec.kpis) return { ...comp, kpis: aiSec.kpis }
            if (comp.type === 'insights' && aiSec.insights) return { ...comp, insights: aiSec.insights }
            if (comp.type === 'table' && aiSec.tableData) return { ...comp, data: aiSec.tableData }
            if (comp.type === 'pie_chart' && comp.title?.includes('Risk') && aiSec.riskData) return { ...comp, data: aiSec.riskData }
            if (comp.type === 'bar_chart' && comp.title?.includes('Profit') && aiSec.profitVsSpendData) return { ...comp, data: aiSec.profitVsSpendData }
            if (comp.type === 'area_chart' && comp.title?.includes('payment') && aiSec.monthlyPaymentTrendData) return { ...comp, data: aiSec.monthlyPaymentTrendData }
            if (comp.type === 'bar_chart' && comp.title?.includes('forecast') && aiSec.cashFlowForecastData) return { ...comp, data: aiSec.cashFlowForecastData }
            if (comp.type === 'pie_chart' && comp.title?.includes('Top suppliers') && aiSec.topSuppliersData) return { ...comp, data: aiSec.topSuppliersData }
            if (comp.type === 'pie_chart' && comp.title?.includes('payables') && aiSec.outstandingPayablesData) return { ...comp, data: aiSec.outstandingPayablesData }
            if (comp.type === 'spend_tiles' && aiSec.departmentSpendData) return { ...comp, data: aiSec.departmentSpendData }
            if (comp.type === 'bar_chart' && comp.title?.includes('Approval') && aiSec.approvalDaysData) return { ...comp, data: aiSec.approvalDaysData }
            return comp
          })

          return {
            ...sec,
            title: aiSec.title || sec.title,
            subtitle: aiSec.subtitle || sec.subtitle,
            summaryBadges: aiSec.summaryBadges || sec.summaryBadges,
            enabled: aiSec.enabled ?? true,
            components,
          }
        }),
      }
      return normalizeDashboardConfig(merged)
    }
  } catch (err) {
    console.warn('Gemini dashboard generation fallback:', err)
  }

  return buildFallbackDashboardConfig(repositoryName, description)
}

/** Fallback generator producing clean sections formatted with component schema */
export function buildFallbackDashboardConfig(
  repositoryName: string,
  description: string,
): DashboardAiConfig {
  const cleanName = repositoryName.trim()

  const rawConfig: any = {
    repositoryName: cleanName,
    description: description || buildFallbackDescription(cleanName),
    source: 'local',
    sections: [
      {
        id: generateUniqueId('sec_cmd'),
        title: `${cleanName} Command Center`,
        subtitle: `Real-time · month · all repository records`,
        isExpanded: true,
        enabled: true,
        summaryBadges: [
          { label: 'TOTAL VOLUME', value: '$485.2K' },
          { label: 'OVERDUE', value: '$42.1K', color: 'text-red-9' },
          { label: 'OPEN ITEMS', value: '18' },
          { label: 'DPO', value: '4d' },
        ],
        kpis: [
          { id: generateUniqueId('kpi'), title: 'TOTAL OUTSTANDING', value: '$485.2K', subtext: 'vs last month', trend: '-97.1%', isPositive: false, enabled: true },
          { id: generateUniqueId('kpi'), title: 'TOTAL PAID', value: '$124.0K', subtext: 'vs last month', trend: '+14.2%', isPositive: true, enabled: true },
          { id: generateUniqueId('kpi'), title: 'PENDING PAYMENTS', value: '$42.1K', subtext: 'vs last month', trend: '-10.5%', isPositive: false, enabled: true },
          { id: generateUniqueId('kpi'), title: 'DUE TODAY', value: '$12.5K', subtext: 'vs last month', trend: '0%', isPositive: true, enabled: true },
          { id: generateUniqueId('kpi'), title: 'OVERDUE', value: '$29.6K', subtext: 'vs last month', trend: '-96.8%', isPositive: false, enabled: true },
          { id: generateUniqueId('kpi'), title: 'AVG. PROCESSING TIME', value: '1.8 d', subtext: 'vs last month', trend: '-40.7%', isPositive: true, enabled: true },
        ],
        insights: [
          { id: generateUniqueId('ins'), text: `100% of critical ${cleanName} records are structurally validated and indexed.`, enabled: true },
          { id: generateUniqueId('ins'), text: `Vendor risk exposure is 100% concentrated within primary service providers.`, enabled: true },
          { id: generateUniqueId('ins'), text: `All open items are within SLA thresholds, representing 0 overdue escalations.`, enabled: true },
          { id: generateUniqueId('ins'), text: `Total repository volume has increased by 14.2% month-over-month.`, enabled: true },
        ],
        riskData: [
          { name: 'Low Risk / Normal', value: 70, amount: '$340K' },
          { name: 'Medium Risk', value: 20, amount: '$97K' },
          { name: 'High Risk / Review', value: 10, amount: '$48K' },
        ],
      },
      {
        id: generateUniqueId('sec_profit'),
        title: 'Profitability & Cash Position',
        subtitle: 'Volume growth eating margin · future liquidity needs',
        isExpanded: true,
        enabled: true,
        summaryBadges: [
          { label: 'PROFIT MARGIN', value: '18.4%', color: 'text-green-9' },
          { label: 'NEXT 4 WEEKS', value: '$142.5K' },
          { label: 'PEAK WEEK', value: 'Week 3' },
        ],
        profitVsSpendData: [
          { name: 'Jan 2026', value: 32000, profitMargin: 24 },
          { name: 'Feb 2026', value: 45000, profitMargin: 22 },
          { name: 'Mar 2026', value: 58000, profitMargin: 20 },
          { name: 'Apr 2026', value: 51000, profitMargin: 19 },
          { name: 'May 2026', value: 69000, profitMargin: 18 },
          { name: 'Jun 2026', value: 84000, profitMargin: 18.4 },
        ],
        monthlyPaymentTrendData: [
          { name: 'Jan', value: 28000 },
          { name: 'Feb', value: 39000 },
          { name: 'Mar', value: 52000 },
          { name: 'Apr', value: 46000 },
          { name: 'May', value: 61000 },
          { name: 'Jun', value: 78000 },
        ],
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
      },
      {
        id: generateUniqueId('sec_risk'),
        title: 'Supplier Concentration & Risk',
        subtitle: 'Where spend concentrates · vendor risk exposure',
        isExpanded: true,
        enabled: true,
        summaryBadges: [
          { label: 'ACTIVE SUPPLIERS', value: '14' },
          { label: 'HIGH RISK', value: '1', color: 'text-red-9' },
          { label: 'TOP-3 CONCENTRATION', value: '78.5%', color: 'text-primary-9' },
        ],
        topSuppliersData: [
          { name: 'Anthropic, PBC', value: 45, amount: '$218K' },
          { name: 'Global Logistics Co', value: 22, amount: '$106K' },
          { name: 'Apex Enterprise Software', value: 18, amount: '$87K' },
          { name: 'Others', value: 15, amount: '$74K' },
        ],
        outstandingPayablesData: [
          { name: 'Current (< 30 days)', value: 82, amount: '$397K' },
          { name: 'Overdue (30-60 days)', value: 12, amount: '$58K' },
          { name: 'Critical (> 60 days)', value: 6, amount: '$29K' },
        ],
        departmentSpendData: [
          { name: 'Operations', value: 42, amount: '$203.7K' },
          { name: 'Finance', value: 28, amount: '$135.8K' },
          { name: 'Legal & HR', value: 18, amount: '$87.3K' },
          { name: 'Technology', value: 12, amount: '$58.2K' },
        ],
      },
      {
        id: generateUniqueId('sec_pipeline'),
        title: 'Aging & Process Oversight',
        subtitle: 'Pipeline throughput efficiency and approval metrics',
        isExpanded: true,
        enabled: true,
        summaryBadges: [
          { label: 'AVG APPROVAL DAYS', value: '2.4d' },
          { label: 'APPROVAL RATE', value: '96.2%', color: 'text-green-9' },
          { label: 'CRITICAL', value: '0' },
        ],
        approvalDaysData: [
          { name: 'Legal', value: 4.8 },
          { name: 'Finance', value: 2.1 },
          { name: 'Operations', value: 1.5 },
          { name: 'IT', value: 1.2 },
        ],
        tableData: [
          { id: generateUniqueId('rec'), title: `${cleanName} Entry #1001`, category: 'Operations', amount: '$12,450.00', status: 'Approved', date: '2026-08-09' },
          { id: generateUniqueId('rec'), title: `${cleanName} Entry #1002`, category: 'Finance', amount: '$8,200.00', status: 'Pending', date: '2026-08-09' },
          { id: generateUniqueId('rec'), title: `${cleanName} Entry #1003`, category: 'Technology', amount: '$24,100.00', status: 'Approved', date: '2026-08-08' },
          { id: generateUniqueId('rec'), title: `${cleanName} Entry #1004`, category: 'Legal & HR', amount: '$5,750.00', status: 'Review', date: '2026-08-07' },
          { id: generateUniqueId('rec'), title: `${cleanName} Entry #1005`, category: 'Operations', amount: '$15,900.00', status: 'Completed', date: '2026-08-06' },
        ],
      },
    ],
  }

  return normalizeDashboardConfig(rawConfig)
}
