import React, { useMemo, useState } from "react";
import "./credits.css";
import DataChart from "./components/DataChart";
import CreditsHeader from "./components/CreditsHeader";
import CreditsChart from "./components/CreditsChart";
import Chartpie from "./components/Chartpie";
import IconButton from '@/components/base/button/IconButton'

import {
  activityCredits,
  monthlyCredits,
  selectedMonth as defaultMonth,
  selectedYear as defaultYear,
  topSubActivityCredits,
  totalCredit,
} from "./sampleCreditData";
type CreditsProps = {
  onBack?: () => void;
};
const Credits: React.FC<CreditsProps> = ({ onBack }) => {  const [searchContent, setSearchContent] = useState("");
  const [monthlySearch, setMonthlySearch] = useState("");
  const [expandedMonths, setExpandedMonths] = useState<string[]>(["Jun - 2026"]);

  const threeDatas = activityCredits.slice(0, 3);

  const filteredMonthlyData = useMemo(() => {
    const query = monthlySearch.toLowerCase();
    if (!query) return monthlyCredits;
    return monthlyCredits.filter((row) =>
      `${row.month} ${row.total} ${row.details.map((detail) => detail.activityType).join(" ")}`
        .toLowerCase()
        .includes(query)
    );
  }, [monthlySearch]);

  const toggleMonth = (month: string) => {
    setExpandedMonths((months) =>
      months.includes(month) ? months.filter((item) => item !== month) : [...months, month]
    );
  };

  const pieData = activityCredits.map((item) => ({ label: item.activityType, value: item.creditUsed }));

  return (
    <div id="creditsContent" className="credits-page bg-[var(--surface)]">
       <div className='mb-4 flex items-center justify-between border-b border-gray-3 bg-surface px-6 py-4 md:px-8'>
          <div className='flex items-start gap-3'>
            <IconButton
              ariaLabel='Back'
              color='gray'
              icon='lucide:arrow-left'
              size='sm'
              variant='ghost'
              onClick={onBack}
            />

           <div>
  <h1 className="text-18/6 font-semibold tracking-tight text-gray-13">
    Credit Usage
  </h1>

  <p className="text-13/5 text-gray-11">
    Monitor credit consumption, usage trends, and module-wise activity across the platform.
  </p>
</div>
          </div>

         
        </div>

                <div className='max-h-[calc(100vh-160px)] overflow-y-auto px-4'>

      <div className="credits-grid top-grid">
        <section className="card">
          <div className="card-header-with-actions"><div className="title">Highest Credit Consumption</div></div>
          <div className="card-content scroll-area">
            <div className="custom-grid-wrapper">
              <div className="grid-header"><div className="grid-header-cell">Type</div><div className="grid-header-cell">Credits Used</div></div>
              {threeDatas.map((value) => (
                <div className="grid-row" key={value.id}>
                  <div className="grid-cell">{value.activityType}</div>
                  <div className="grid-cell"><DataChart dataValue={value.creditUsed} total={totalCredit} /></div>
                </div>
              ))}
              <div className="grid-footer"><div>Total</div><strong>{totalCredit.toLocaleString()}</strong></div>
            </div>
          </div>
        </section>

        <section className="card">
          <div className="card-header-with-actions"><div className="title">Credit Distribution Report</div></div>
          <div className="card-content scroll-area">
            <div className="custom-grid-wrapper">
              <div className="grid-header"><div className="grid-header-cell">Type</div><div className="grid-header-cell">Credits Used</div></div>
              {topSubActivityCredits.map((value) => (
                <div className="grid-row" key={value.id}>
                  <div className="grid-cell">{value.subActivityName}</div>
                  <div className="grid-cell"><DataChart dataValue={value.totalCreditUsed} total={totalCredit} /></div>
                </div>
              ))}
              <div className="grid-footer"><div>Total</div><strong>{totalCredit.toLocaleString()}</strong></div>
            </div>
          </div>
        </section>

        <section className="card"><CreditsHeader selectedMonth={defaultMonth} /></section>
      </div>

      <div className="credits-grid middle-grid">
        <section className="card monthly-breakdown-card">
          <div className="card-header-with-actions">
            <div className="title">Monthly Credit Consumption - {defaultYear}</div>
            <input className="search-input" value={monthlySearch} onChange={(event) => setMonthlySearch(event.target.value)} placeholder="Search month" />
          </div>
          <div className="card-content scroll-area">
            {filteredMonthlyData.map((month) => {
              const isExpanded = expandedMonths.includes(month.month);
              return (
                <div className="month-block" key={month.month}>
                  <button className="month-row" onClick={() => toggleMonth(month.month)}>
                    <span>{isExpanded ? "▾" : "▸"} {month.month}</span>
                    <strong>{month.total.toLocaleString()}</strong>
                  </button>
                  {isExpanded && (
                    <div className="month-details">
                      {month.details.map((detail) => (
                        <div className="grid-row" key={`${month.month}-${detail.activityType}`}>
                          <div className="grid-cell">{detail.activityType}</div>
                          <div className="grid-cell"><DataChart dataValue={detail.creditUsed} total={month.total} /></div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </section>

        <section className="card activity-card">
          <div className="card-header-with-actions">
            <div className="title">Credit Usage Details - {defaultMonth}</div>
            <input className="search-input" value={searchContent} onChange={(event) => setSearchContent(event.target.value)} placeholder="Search type" />
          </div>
          <div className="card-content scroll-area"><CreditsChart data={activityCredits} search={searchContent} /></div>
        </section>
      </div>

      <section className="card pie-section">
        <div className="card-header-with-actions"><div className="title">Overall Credit Split</div></div>
        <Chartpie value={pieData} />
      </section>
      </div>
    </div>
  );
};

export default Credits;
