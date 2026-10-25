import { renderChartImage } from '../charts/engine';
import { measurementChartOption } from '../charts/options';
import { planReportViews, prepareReportChart } from './builder';
import { reportChartHeight, REPORT_CHART_PIXELS } from './chartLayout';
import { reportPageArea } from './paper';
import type { PreparedReportView, ReportInput } from './types';

/** Render sequentially so each ECharts canvas is released before the next page is generated. */
export async function renderBuilderViews(
  input: ReportInput,
  hasTargets: boolean,
  cancelled: () => boolean = () => false,
): Promise<PreparedReportView[]> {
  const result: PreparedReportView[] = [];
  const plans = planReportViews(input);
  for (const plan of plans) {
    if (cancelled()) throw new Error('Report generation cancelled.');
    const item: PreparedReportView = {
      title: plan.title,
      seriesIds: plan.input.series.map((series) => series.id),
      mode: plan.view.mode === 'info' ? 'info' : 'chart',
    };
    if (plan.view.mode !== 'info') {
      const prepared = prepareReportChart(plan);
      item.message = prepared.message;
      if (!prepared.message) {
        const height = reportChartHeight(
          prepared.legend,
          prepared.descriptions,
          result.length === 0 &&
            !input.template!.sections.details &&
            !input.template!.sections.statistics &&
            !hasTargets,
          input.profile.reportPaperSize,
          plan.title,
          input.template!.name,
        );
        item.chart = {
          image: renderChartImage(
            measurementChartOption(prepared.presentation),
            plan.view.mode,
            (height * REPORT_CHART_PIXELS) / reportPageArea(input.profile.reportPaperSize).width,
          ),
          legend: prepared.legend,
          descriptions: prepared.descriptions,
        };
      }
    }
    result.push(item);
    // Give the browser a chance to paint progress or process Close between expensive views.
    await new Promise((resolve) => setTimeout(resolve, 0));
  }
  return result;
}
