export const generateDummySummary = (seed: number | string = 0) => {
    // Simple deterministic PRNG
    const numSeed = typeof seed === 'string' ? seed.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0) : seed
    const random = (offset: number) => {
        const x = Math.sin(numSeed + offset) * 10000
        return x - Math.floor(x)
    }

    const randomScore = Math.floor(random(1) * 100)
    const decisions = ['APPROVED', 'REJECTED', 'PARTIALLY APPROVED']
    const randomDecision = decisions[Math.floor(random(2) * decisions.length)]
    
    // Line items logic
    const randomLineItems = Math.floor(random(3) * 10) + 1
    const randomMatched = Math.floor(random(4) * randomLineItems)
    
    // Due Date logic
    const dueDates = ['Due Today', 'Due in 2 days', 'Due Jan 28', 'Overdue']
    const randomDueDate = dueDates[Math.floor(random(5) * dueDates.length)]
    const dueDateTheme = randomDueDate === 'Overdue' ? 'red' : randomDueDate === 'Due Today' ? 'orange' : 'blue'

    const matchPct = (randomMatched / randomLineItems) * 100
    const extractionTheme = matchPct > 80 ? 'green' : matchPct > 50 ? 'orange' : 'red'

    return {
      score: {
        value: `${randomScore}% Confidence`,
        badgeText: `${randomScore}% Confidence`,
        shortText: `${randomScore}%`,
        theme: randomScore > 80 ? 'green' : randomScore > 50 ? 'orange' : 'red',
        pct: randomScore,
        icon: 'tabler:gauge',
        label: 'Confidence',
        status: randomScore > 80 ? 'High' : randomScore > 50 ? 'Medium' : 'Low',
        description: 'Extraction quality'
      },
      decision: {
        value: randomDecision,
        badgeText: randomDecision === 'PARTIALLY APPROVED' ? 'Partially Approved' : randomDecision === 'APPROVED' ? 'Approved' : 'Rejected',
        shortText: randomDecision === 'PARTIALLY APPROVED' ? 'Partial' : randomDecision === 'APPROVED' ? 'Approved' : 'Rejected',
        theme: randomDecision === 'APPROVED' ? 'green' : randomDecision === 'REJECTED' ? 'red' : 'blue',
        pct: randomDecision === 'APPROVED' || randomDecision === 'REJECTED' ? 100 : 72,
        icon: 'tabler:gavel',
        label: 'Decision',
        status: randomDecision === 'APPROVED' ? 'Verified' : randomDecision === 'REJECTED' ? 'Not Approved' : 'In review',
        description: 'Auto-decision status'
      },
      extraction: {
        value: `${randomMatched}/${randomLineItems} items matched`,
        badgeText: `${randomMatched}/${randomLineItems} items matched`,
        shortText: `${randomMatched}/${randomLineItems}`,
        theme: extractionTheme,
        pct: matchPct,
        icon: 'tabler:list-check',
        label: 'Line Items',
        status: 'Matched',
        description: 'Items extracted'
      },
      dueDate: {
        value: randomDueDate === 'Due Jan 28' ? 'Due on Jan 28' : randomDueDate,
        badgeText: randomDueDate === 'Due Jan 28' ? 'Due on Jan 28' : randomDueDate,
        shortText: randomDueDate === 'Due Jan 28' ? 'Jan 28' : randomDueDate === 'Due Today' ? 'Today' : randomDueDate === 'Due in 2 days' ? 'In 2 days' : 'Overdue',
        theme: dueDateTheme,
        pct: randomDueDate === 'Overdue' ? 100 : randomDueDate === 'Due Today' ? 80 : 40,
        icon: 'tabler:calendar-due',
        label: 'Due Date',
        status: randomDueDate,
        description: 'Payment Deadline'
      }
    }
  }
