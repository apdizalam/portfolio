import type { Contributions } from "@/lib/types";
import { BarsIcon } from "./Icons";

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

export default function GitHubActivity({ data, profileUrl }: { data: Contributions; profileUrl: string }) {
  const weeks = data.weeks.slice(-53);
  let lastMonth = -1;
  const labels = weeks.map((week, w) => {
    const m = new Date(week[0][0] + "T00:00:00").getMonth();
    if (m !== lastMonth && w < weeks.length - 2) {
      lastMonth = m;
      return MONTHS[m];
    }
    return "";
  });
  const pad = weeks.length ? new Date(weeks[0][0][0] + "T00:00:00").getDay() : 0;

  return (
    <div className="card github">
      <div className="github__head">
        <h2 className="github__title">
          <a href={profileUrl} target="_blank" rel="noopener"><BarsIcon /> GitHub Activity</a>
        </h2>
        <p className="github__total">{data.total.toLocaleString("en-US")} contributions in the last year</p>
      </div>
      <div className="github__scroll">
        <div className="github__months">
          {labels.map((l, i) => <span key={i}>{l}</span>)}
        </div>
        <div className="github__grid" role="img" aria-label={`${data.total} GitHub contributions in the last year`}>
          {Array.from({ length: pad }).map((_, i) => <i key={`p${i}`} style={{ visibility: "hidden" }} />)}
          {weeks.flat().map(([date, count, lvl]) => (
            <i
              key={date}
              className={lvl ? `lvl-${lvl}` : undefined}
              title={`${count} contribution${count === 1 ? "" : "s"} on ${new Date(date + "T00:00:00").toDateString()}`}
            />
          ))}
        </div>
      </div>
      <div className="github__legend">
        <span>Less</span>
        <i className="lvl-0" /><i className="lvl-1" /><i className="lvl-2" /><i className="lvl-3" /><i className="lvl-4" />
        <span>More</span>
      </div>
    </div>
  );
}
