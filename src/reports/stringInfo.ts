import type { Content } from 'pdfmake/interfaces';
import { availableQuantities } from '../domain/analysis';
import { stringInformation } from '../domain/stringInformation';
import { formatQuantity } from '../domain/units';
import type { ReportInput } from './types';

/** Export every selected string's display quantities plus its complete, unrounded local JSON record. */
export function reportStringInfo(input: ReportInput): Content[] {
  return input.series.flatMap((series): Content[] => {
    const context = { seriesId: series.id };
    const quantities = availableQuantities(
      [context],
      [series],
      input.fields,
      input.annotations,
      input.profile.unitSystem,
      true,
    ).filter((item) => !['velocity', 'g1', 'g7'].includes(item.id) && item.read(context) !== null);
    return [
      { text: series.name, style: 'section', headlineLevel: 2 },
      ...(quantities.length
        ? [
            {
              table: {
                widths: [240, '*'],
                body: quantities.map((item) => [
                  item.label,
                  formatQuantity(item.read(context), item.id, item.unit),
                ]),
              },
              layout: 'lightHorizontalLines',
              fontSize: 9,
              margin: [0, 0, 0, 12],
            } as Content,
          ]
        : []),
      { text: 'Complete string data (JSON)', style: 'section', headlineLevel: 2 },
      {
        text: 'Stored units and full precision. Includes original provider fields and local annotations.',
        style: 'small',
        margin: [0, 0, 0, 8],
      },
      // Normal flowing text may cross pages. Never put the complete record in an unbreakable block.
      {
        text: JSON.stringify(
          stringInformation(series, input.annotations, input.fields, input.tags),
          null,
          2,
        ),
        fontSize: 8,
        lineHeight: 1.1,
        preserveLeadingSpaces: true,
        margin: [0, 0, 0, 18],
      },
    ];
  });
}
