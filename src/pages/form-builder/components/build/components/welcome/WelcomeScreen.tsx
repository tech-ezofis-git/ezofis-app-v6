import { Button, Card, TextInput, Title } from '@mantine/core'
import { useState } from 'react'
import Icon from '@/components/base/icon/Icon'
import { useFormStore } from '@/pages/form-builder/store/formStore'
import useAskAIStore from '@/components/common/ask-ai/stores/useAskAIStore'
import { motion } from 'framer-motion'
import Logo from '@/components/common/Logo'

const WelcomeScreen = () => {
  const { addPanel, appendAIResponse } = useFormStore()
  const { sendMessage, open: openAI } = useAskAIStore()
  const [prompt, setPrompt] = useState('')
  const [isGenerating, setIsGenerating] = useState(false)

  const handleBlank = () => {
    addPanel()
  }

  const handleTemplate = (type: 'AP' | 'INVOICE' | 'FINANCIAL_AUDIT') => {
    if (type === 'AP') {
      appendAIResponse({
        name: 'Accounts Payable Form',
        description: 'Standard form for processing accounts payable requests.',
        panels: [
          {
            title: 'Vendor Information',
            description: 'Enter the details of the vendor providing the service or goods.',
            fields: [
              { label: 'Vendor Name', type: 'SHORT_TEXT', settings: { validation: { fieldRule: 'REQUIRED' } } },
              { label: 'Vendor ID', type: 'SHORT_TEXT' },
              { label: 'Invoice Date', type: 'DATE' },
              { label: 'Invoice Number', type: 'SHORT_TEXT', settings: { validation: { fieldRule: 'REQUIRED' } } },
            ]
          },
          {
            title: 'Payment Details',
            description: 'Specify the amount and payment method.',
            fields: [
              { label: 'Total Amount', type: 'CURRENCY_AMOUNT', settings: { validation: { fieldRule: 'REQUIRED' } } },
              { label: 'Payment Terms', type: 'SINGLE_SELECT', settings: { specific: { customOptions: 'Net 30\nNet 60\nDue on Receipt' } } },
              { label: 'Upload Invoice', type: 'FILE_UPLOAD', settings: { validation: { fieldRule: 'REQUIRED' } } },
            ]
          }
        ]
      })
    } else if (type === 'INVOICE') {
      appendAIResponse({
        name: 'Invoice Matching Report',
        description: 'Automated matching and validation of invoices against purchase orders.',
        panels: [
          {
            title: 'Invoice Details',
            description: 'Core metadata extracted from the invoice and matching system.',
            fields: [
              { label: 'Supplier Name', type: 'SHORT_TEXT', settings: { validation: { fieldRule: 'REQUIRED' } } },
              { label: 'PO Number', type: 'SHORT_TEXT', settings: { validation: { fieldRule: 'REQUIRED' } } },
              { label: 'Currency', type: 'SHORT_TEXT', settings: { general: { size: 'col-4' } } },
              { label: 'Total Due', type: 'CURRENCY_AMOUNT', settings: { general: { size: 'col-4' } } },
              { label: 'Match Score (%)', type: 'NUMBER', settings: { general: { size: 'col-4' } } },
            ]
          },
          {
            title: 'Audit & Logic',
            description: 'System decisions and discrepancy explanations.',
            fields: [
              { label: 'Decision', type: 'SHORT_TEXT' },
              { label: 'Reason', type: 'LONG_TEXT' },
            ]
          },
          {
            title: 'Line Item Comparison',
            description: 'Side-by-side matching of individual items.',
            fields: [
              { label: 'Line Items', type: 'TABLE' }
            ]
          }
        ]
      })
    } else if (type === 'FINANCIAL_AUDIT') {
      appendAIResponse({
        name: 'Financial Audit Report',
        description: 'Comprehensive GL matching analysis and invoice discrepancy audit.',
        panels: [
          {
            title: 'Audit Overview',
            description: 'Core metadata and high-level audit results.',
            fields: [
              { label: 'Supplier Name', type: 'SHORT_TEXT', settings: { general: { size: 'col-6' } } },
              { label: 'Matter ID', type: 'SHORT_TEXT', settings: { general: { size: 'col-6' } } },
              { label: 'Client Name', type: 'SHORT_TEXT', settings: { general: { size: 'col-4' } } },
              { label: 'Currency', type: 'SHORT_TEXT', settings: { general: { size: 'col-4' } } },
              { label: 'Invoice Amount', type: 'CURRENCY_AMOUNT', settings: { general: { size: 'col-4' } } },
              { label: 'Due Date', type: 'DATE', settings: { general: { size: 'col-4' } } },
              { label: 'Audit Decision', type: 'SHORT_TEXT', settings: { general: { size: 'col-4' } } },
              { label: 'Overall Score (%)', type: 'NUMBER', settings: { general: { size: 'col-4' } } },
            ]
          },
          {
            title: 'Analysis Reasoning',
            description: 'AI-generated justification for the audit decision.',
            fields: [
              { label: 'Audit Reasoning', type: 'LONG_TEXT' },
            ]
          },
          {
            title: 'GL Matching Details',
            description: 'Detailed line-item categorization and confidence analysis.',
            fields: [
              { label: 'GL Matching Table', type: 'TABLE' }
            ]
          }
        ]
      })
    }
  }

  const handleAI = async () => {
    if (!prompt.trim()) return
    setIsGenerating(true)
    openAI()
    await sendMessage(prompt)
    setIsGenerating(false)
  }

  return (
    <div className='relative flex h-full flex-col items-center justify-center overflow-hidden px-10 font-inter bg-gray-50/50'>
      <div className='relative w-full max-w-6xl text-center z-10'>
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className='mb-6'
        >
          <div className='mb-6 flex justify-center'>
            <div className='relative group'>
              <div className='absolute -inset-2 bg-gray-9/5 rounded-2xl blur-lg opacity-0 group-hover:opacity-100 transition-all duration-500' />
              <Logo className="relative scale-150 transition-transform duration-500 group-hover:scale-[1.6]" />
            </div>
          </div>
          <Title className='mb-1 text-3xl font-black tracking-tight text-gray-13 md:text-4xl' order={1}>
            Design your form
          </Title>
          <p className='text-sm font-medium text-gray-10 max-w-lg mx-auto opacity-70'>
            Zero to published in seconds. Start blank, use a template, or ask AI.
          </p>
        </motion.div>

        {/* AI Prompt Area: Clean & Professional */}
        <motion.div 
          initial={{ opacity: 0, scale: 0.98 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5, delay: 0.1 }}
          className='mb-8 relative mx-auto max-w-lg'
        >
          <div className='relative overflow-hidden rounded-[1rem] border border-gray-2 bg-white shadow-[0_10px_30px_rgba(0,0,0,0.04)] p-1.5'>
            <div className='flex items-center gap-2 pr-1'>
              <TextInput
                className='flex-1'
                classNames={{
                  input: 'border-0 bg-transparent text-base font-semibold placeholder:text-gray-7 focus:ring-0 h-10 px-4',
                }}
                disabled={isGenerating}
                placeholder='Describe your form...'
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleAI()}
              />
              <Button
                className='h-8 rounded-lg bg-primary-10 px-5 font-bold shadow-md shadow-primary-9/30 hover:scale-[1.02] active:scale-95 transition-all text-xs group'
                disabled={!prompt.trim() || isGenerating}
                loading={isGenerating}
                onClick={handleAI}
              >
                <div className='flex items-center gap-1.5'>
                  <Icon height={14} name='mingcute:ai-fill' width={14} />
                  <span>Generate</span>
                </div>
              </Button>
            </div>
          </div>
        </motion.div>

        {/* Templates Grid: Workspace Color Themed */}
        <div className='grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4'>
          {/* Blank Card */}
          <motion.div
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.4, delay: 0.2 }}
          >
            <Card
              className='group relative h-full cursor-pointer overflow-hidden rounded-[1.5rem] border-0 bg-white p-5 shadow-[0_4px_15px_rgba(0,0,0,0.02)] transition-all duration-400 hover:shadow-[0_15px_30px_rgba(0,0,0,0.05)] active:scale-[0.98]'
              onClick={handleBlank}
            >
              <div className='mb-5'>
                <div className='flex size-10 items-center justify-center rounded-xl bg-gray-2 text-gray-8 transition-all group-hover:bg-primary-9 group-hover:text-white'>
                  <Icon height={20} name='lucide:plus-circle' width={20} />
                </div>
              </div>
              <div className='text-left mb-4'>
                <div className='text-lg font-bold tracking-tight text-gray-13 mb-0.5'>
                  Blank Canvas
                </div>
                <div className='text-[11px] font-medium text-gray-10 opacity-50'>
                  Clean slate
                </div>
              </div>
              <div className='aspect-video rounded-xl bg-gray-1 flex items-center justify-center group-hover:bg-primary-3 transition-colors overflow-hidden'>
                <div className="relative">
                  <Icon className='text-gray-3 group-hover:text-primary-9/10 transition-all' height={70} name='lucide:layout' width={70} />
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="w-8 h-8 rounded bg-white shadow-sm scale-0 group-hover:scale-100 transition-transform" />
                  </div>
                </div>
              </div>
            </Card>
          </motion.div>

          {/* Accounts Payable - Secondary (Cyan) Theme */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.3 }}
          >
            <Card
              className='group relative h-full cursor-pointer overflow-hidden rounded-[1.5rem] border-0 bg-white p-5 shadow-[0_4px_15px_rgba(0,0,0,0.02)] transition-all duration-400 hover:shadow-[0_15px_30px_rgba(0,0,0,0.05)] active:scale-[0.98]'
              onClick={() => handleTemplate('AP')}
            >
              <div className='mb-5 flex items-center justify-between'>
                <div className='flex size-10 items-center justify-center rounded-xl bg-secondary-3 text-secondary-9 transition-all group-hover:bg-secondary-9 group-hover:text-white'>
                  <Icon height={20} name='lucide:receipt-indian-rupee' width={20} />
                </div>
                <span className="text-[9px] font-black tracking-widest text-secondary-9 bg-secondary-2 px-2 py-0.5 rounded-full uppercase group-hover:bg-secondary-9 group-hover:text-white transition-colors">Popular</span>
              </div>
              <div className='text-left mb-4'>
                <div className='text-lg font-bold tracking-tight text-gray-13 mb-0.5'>
                  Accounts Payable
                </div>
                <div className='text-[11px] font-medium text-gray-10 opacity-50'>
                  Automate invoices
                </div>
              </div>
              <div className='relative aspect-video rounded-xl bg-secondary-2 p-3 flex flex-col gap-1.5 group-hover:bg-secondary-3/50 transition-colors'>
                <div className='h-2.5 w-3/4 rounded-full bg-secondary-5/50' />
                <div className='h-2.5 w-1/2 rounded-full bg-secondary-4/30' />
                <div className='grid grid-cols-2 gap-2 mt-auto'>
                  <div className='h-6 rounded-lg bg-surface shadow-sm' />
                  <div className='h-6 rounded-lg bg-surface shadow-sm' />
                </div>
              </div>
            </Card>
          </motion.div>

          {/* Invoice Matching - Teal/Green Theme */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.4 }}
          >
            <Card
              className='group relative h-full cursor-pointer overflow-hidden rounded-[1.5rem] border-0 bg-white p-5 shadow-[0_4px_15px_rgba(0,0,0,0.02)] transition-all duration-400 hover:shadow-[0_15px_30px_rgba(0,0,0,0.05)] active:scale-[0.98]'
              onClick={() => handleTemplate('INVOICE')}
            >
              <div className='mb-5 flex items-center justify-between'>
                <div className='flex size-10 items-center justify-center rounded-xl bg-teal-3 text-teal-9 transition-all group-hover:bg-teal-9 group-hover:text-white'>
                  <Icon height={20} name='lucide:file-check' width={20} />
                </div>
                <span className="text-[9px] font-black tracking-widest text-teal-9 bg-teal-2 px-2 py-0.5 rounded-full uppercase group-hover:bg-teal-9 group-hover:text-white transition-colors">Fast</span>
              </div>
              <div className='text-left mb-4'>
                <div className='text-lg font-bold tracking-tight text-gray-13 mb-0.5'>
                  Invoice Matching
                </div>
                <div className='text-[11px] font-medium text-gray-10 opacity-50'>
                  AI PO verify
                </div>
              </div>
              <div className='relative aspect-video rounded-xl bg-teal-2 p-3 flex flex-col gap-2 group-hover:bg-teal-3/50 transition-colors'>
                <div className='flex items-center gap-2'>
                  <div className='size-6 rounded-full bg-teal-9 flex items-center justify-center shadow-sm'>
                    <Icon name="lucide:check" width={12} className="text-white" />
                  </div>
                  <div className='h-2.5 w-1/2 rounded-full bg-teal-5/50' />
                </div>
                <div className='mt-auto h-8 w-full rounded-lg bg-surface shadow-sm' />
              </div>
            </Card>
          </motion.div>

          {/* Financial Audit - Orange Theme */}
          <motion.div
            initial={{ opacity: 0, x: 10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.4, delay: 0.5 }}
          >
            <Card
              className='group relative h-full cursor-pointer overflow-hidden rounded-[1.5rem] border-0 bg-white p-5 shadow-[0_4px_15px_rgba(0,0,0,0.02)] transition-all duration-400 hover:shadow-[0_15px_30px_rgba(0,0,0,0.05)] active:scale-[0.98]'
              onClick={() => handleTemplate('FINANCIAL_AUDIT')}
            >
              <div className='mb-5 flex items-center justify-between'>
                <div className='flex size-10 items-center justify-center rounded-xl bg-orange-3 text-orange-9 transition-all group-hover:bg-orange-9 group-hover:text-white'>
                  <Icon height={20} name='lucide:file-chart-column' width={20} />
                </div>
                <span className="text-[9px] font-black tracking-widest text-orange-9 bg-orange-2 px-2 py-0.5 rounded-full uppercase group-hover:bg-orange-9 group-hover:text-white transition-colors">Audit</span>
              </div>
              <div className='text-left mb-4'>
                <div className='text-lg font-bold tracking-tight text-gray-13 mb-0.5'>
                  Financial Audit
                </div>
                <div className='text-[11px] font-medium text-gray-10 opacity-50'>
                  GL Analysis
                </div>
              </div>
              <div className='relative aspect-video rounded-xl bg-orange-2 p-3 flex flex-col gap-2 group-hover:bg-orange-3/50 transition-colors'>
                <div className='flex items-end gap-1 h-10 mt-1'>
                  <div className='flex-1 bg-orange-7 h-[40%] rounded-t-sm' />
                  <div className='flex-1 bg-orange-9 h-[90%] rounded-t-sm' />
                  <div className='flex-1 bg-orange-8 h-[60%] rounded-t-sm' />
                  <div className='flex-1 bg-orange-10 h-[75%] rounded-t-sm' />
                </div>
                <div className='mt-auto h-2.5 w-full rounded-full bg-orange-4/30' />
              </div>
            </Card>
          </motion.div>
        </div>
      </div>
    </div>
  )
}

WelcomeScreen.displayName = 'WelcomeScreen'
export default WelcomeScreen
