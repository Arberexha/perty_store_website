import { euro } from "@/lib/admin/format";

type Point = { day: string; order_count: number; revenue_cents: number };

export function AdminChart({ title, points, field }: { title: string; points: Point[]; field: "order_count" | "revenue_cents" }) {
  const values = points.map((point) => Number(point[field]));
  const maximum = Math.max(1, ...values);
  const x = (index: number) => 28 + index * (544 / Math.max(1, points.length - 1));
  const y = (value: number) => 145 - (value / maximum) * 108;
  const line = values.map((value, index) => `${index ? "L" : "M"}${x(index)},${y(value)}`).join(" ");
  return <section className="admin-panel chart-panel"><div className="panel-title"><div><h2>{title}</h2><p>Last 7 days</p></div><strong>{field === "order_count" ? values.reduce((sum, value) => sum + value, 0) : euro(values.reduce((sum, value) => sum + value, 0))}</strong></div><svg viewBox="0 0 600 182" role="img" aria-label={`${title} over the last seven days`} preserveAspectRatio="none"><line x1="28" y1="145" x2="572" y2="145" stroke="#dce5dc" /><line x1="28" y1="91" x2="572" y2="91" stroke="#edf2ed" /><line x1="28" y1="37" x2="572" y2="37" stroke="#edf2ed" />{field === "order_count" ? <><path d={`${line} L${x(values.length - 1)},145 L${x(0)},145 Z`} fill="#e7f3e9" /><path d={line} fill="none" stroke="#267454" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />{values.map((value, index) => <circle key={index} cx={x(index)} cy={y(value)} r="3.5" fill="#267454" />)}</> : values.map((value, index) => <rect key={index} x={x(index) - 16} y={y(value)} width="32" height={145 - y(value)} rx="3" fill="#e69b6b" />)}{points.map((point, index) => <text key={point.day} x={x(index)} y="172" textAnchor="middle" fill="#829487" fontSize="10">{new Intl.DateTimeFormat("en-GB", { weekday: "short", timeZone: "UTC" }).format(new Date(`${point.day}T12:00:00Z`))}</text>)}</svg></section>;
}
