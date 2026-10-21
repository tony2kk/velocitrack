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

/** Image of the live viewport, plus the legend that the app renders outside the chart canvas. */
export interface ReportChart {
  image: string;
  legend: { label: string; color: string }[];
  descriptions: string[];
}

/** Detached selection at the instant PDF is requested; no source credentials or connection records. */
export interface ReportInput {
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
  capture: () => ReportInput;
}
