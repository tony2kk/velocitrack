import type {
  Annotation,
  Attachment,
  CatalogItem,
  FieldDefinition,
  Profile,
  Series,
  Shot,
  Tag,
} from '../domain/model';
import type { ReportProfile } from '../domain/reportProfiles';

/** Image of the live viewport, plus the legend that the app renders outside the chart canvas. */
export interface ReportChart {
  image: string;
  legend: { label: string; color: string }[];
  descriptions: string[];
}

/** Detached selection at the instant PDF is requested; no source credentials or connection records. */
export interface ReportInput {
  /** Optional detached template; Quick report has no template and captures the live viewport. */
  template?: ReportProfile;
  colorOrder?: string[];
  /** Prepared views are transient PDF content, never persisted or included in backups. */
  views?: PreparedReportView[];
  series: Series[];
  shots: Shot[];
  profile: Profile;
  catalog: CatalogItem[];
  annotations: Annotation[];
  fields: FieldDefinition[];
  tags: Tag[];
  attachments: Attachment[];
  chart?: ReportChart;
  createdAt: string;
  version: string;
  revision: string;
}

/** Capture current chart/selection without changing saved settings or navigation. */
export interface ReportHandle {
  capture: (includeChart?: boolean) => ReportInput;
}

/** One template item can expand into multiple named chart pages, or one flowing String info section. */
export interface PreparedReportView {
  title: string;
  seriesIds: string[];
  mode: 'chart' | 'info';
  chart?: ReportChart;
  message?: string;
}
