import { useMemo, useState } from 'react';
import { ArrowRight, Info } from 'lucide-react';
import { bookingUrl } from '../data';
import { AnimatedNumber } from './AnimatedNumber';

const villaPrice = 460000;

const formatMoney = (amount: number) =>
  new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0,
  }).format(amount);

export function RoiCalculator() {
  const [dailyRate, setDailyRate] = useState(220);
  const [occupancy, setOccupancy] = useState(65);
  const [appreciation, setAppreciation] = useState(5);

  const result = useMemo(() => {
    const rental = dailyRate * 365 * (occupancy / 100);
    const capital = villaPrice * (appreciation / 100);
    const total = rental + capital;
    return { rental, capital, total, percentage: (total / villaPrice) * 100 };
  }, [dailyRate, occupancy, appreciation]);

  return (
    <div className="roi-calculator">
      <div className="roi-controls">
        <div className="range-field">
          <div className="range-field__label">
            <label htmlFor="daily-rate">Expected Daily Rate</label>
            <output htmlFor="daily-rate">{formatMoney(dailyRate)}</output>
          </div>
          <input
            id="daily-rate"
            type="range"
            min="100"
            max="500"
            step="10"
            value={dailyRate}
            onChange={(event) => setDailyRate(Number(event.target.value))}
            style={{ '--progress': `${((dailyRate - 100) / 400) * 100}%` } as React.CSSProperties}
          />
          <div className="range-field__scale"><span>$100</span><span>$500</span></div>
        </div>

        <div className="range-field">
          <div className="range-field__label">
            <label htmlFor="occupancy">Expected Occupancy Rate</label>
            <output htmlFor="occupancy">{occupancy}%</output>
          </div>
          <input
            id="occupancy"
            type="range"
            min="30"
            max="90"
            step="1"
            value={occupancy}
            onChange={(event) => setOccupancy(Number(event.target.value))}
            style={{ '--progress': `${((occupancy - 30) / 60) * 100}%` } as React.CSSProperties}
          />
          <div className="range-field__scale"><span>30%</span><span>90%</span></div>
        </div>

        <div className="range-field">
          <div className="range-field__label">
            <label htmlFor="appreciation">Expected Capital Appreciation / year</label>
            <output htmlFor="appreciation">{appreciation}%</output>
          </div>
          <input
            id="appreciation"
            type="range"
            min="0"
            max="15"
            step="0.5"
            value={appreciation}
            onChange={(event) => setAppreciation(Number(event.target.value))}
            style={{ '--progress': `${(appreciation / 15) * 100}%` } as React.CSSProperties}
          />
          <div className="range-field__scale"><span>0%</span><span>15%</span></div>
        </div>
      </div>

      <div className="roi-result">
        <span className="eyebrow eyebrow--light">Projected Annual Outcome</span>
        <strong><AnimatedNumber value={result.percentage} format={(value) => `${value.toFixed(1)}%`} /></strong>
        <dl>
          <div><dt>Rental Income</dt><dd><AnimatedNumber value={result.rental} format={formatMoney} /></dd></div>
          <div><dt>Capital Gain</dt><dd><AnimatedNumber value={result.capital} format={formatMoney} /></dd></div>
          <div><dt>Total ROI</dt><dd><AnimatedNumber value={result.total} format={formatMoney} /></dd></div>
        </dl>
        <a href={bookingUrl} target="_blank" rel="noreferrer" className="roi-result__cta">
          Receive Investment Details <ArrowRight aria-hidden="true" />
        </a>
        <p className="roi-note"><Info aria-hidden="true" /> Benchmarks are indicative for Tabanan, Bali. Costs, taxes and fees are not included. Returns are not guaranteed.</p>
      </div>
    </div>
  );
}
