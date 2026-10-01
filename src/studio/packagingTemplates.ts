import { banderoleSize } from './banderoleGeometry';
import type { PackagingDocument, PackagingKind, PackagingLayer, PackagingPage } from './model';

export const packagingTypes: {
  kind: PackagingKind;
  label: string;
  widthMm: number;
  heightMm: number;
  examples: string[];
}[] = [
  {
    kind: 'banderole',
    label: 'Banderole',
    widthMm: banderoleSize.width,
    heightMm: banderoleSize.height,
    examples: ['Pflege & Inhaltsstoffe', 'Lebensmittel umweltfreundlich', 'Anwendung DE / EN'],
  },
  {
    kind: 'envelope',
    label: 'Briefumschlag C6',
    widthMm: 192,
    heightMm: 246,
    examples: [
      'Bienenwachstuch',
      'Produktinformation',
      'Anwendung & Pflege',
      'Pflege & Inhaltsstoffe',
    ],
  },
  {
    kind: 'rigid',
    label: 'Verpackung fest',
    widthMm: 266.7,
    heightMm: 472.369,
    examples: ['Pflege & Anwendung', 'Bienenwachstuch 25 × 25 cm', 'Produktinformation'],
  },
  {
    kind: 'carton',
    label: 'Faltschachtel',
    widthMm: 276.008,
    heightMm: 363.855,
    examples: ['Inhalt & Dankeschön', 'Produktinformation', 'Obermaiselstein'],
  },
];

// Text transcribed from the source PDFs; outlined text (envelope 4, Obermaiselstein)
// was read with OCR and checked against the rendered pages. Layout uses independent
// text blocks within the panels, rather than preserving the PDF's text fragments.
const care = 'Pflege\nMit kaltem Wasser reinigen. Bei Bedarf etwas Spülmittel verwenden.';
const ingredients = 'Inhaltsstoffe\nBienenwachs · Baumwolle · Kiefernharz';
const application =
  'Anwendung\nMit den Händen leicht anwärmen und an die abzudeckende Schüssel oder Frucht andrücken. Nicht zum Abdecken von Fleisch oder Fisch geeignet. Nicht Temperaturen über 30 °C aussetzen.';
const intro =
  'Ihr neues Bienenwachstuch ist die nachhaltige Alternative zur herkömmlichen Frischhaltefolie. Es ist wiederverwendbar, vollständig abbaubar und antibakteriell. Deshalb eignet es sich auch ideal zum Abdecken, Frischhalten und Einpacken von Speisen.';
const usage =
  'Verwendung\nTuch kneten, damit es geschmeidig wird. Dann Lebensmittel darin einpacken oder Tuch eng um das Gefäß wickeln. Nach Verwendung mit kaltem oder lauwarmem Wasser abwaschen.';
const notes =
  '• Nicht zur Aufbewahrung von Fisch, Fleisch und stark fettenden Lebensmitteln geeignet\n• Bis zu 500-mal wiederverwendbar\n• Vor der ersten Anwendung mit kaltem Wasser abspülen\n• Nicht auf dem Heizkörper trocknen und nicht über 30 °C lagern';
const address = 'Inverkehrbringer\nMusterfirma\nMusterstraße 1\n12345 Musterstadt';
const slogan = 'Die umweltfreundliche Alternative zu Alu- und Frischhaltefolie';

// x/y are the top-left of a reserved layout area; the saved model uses its center.
function block(
  value: string,
  x: number,
  y: number,
  width: number,
  height: number,
  pt = 9,
  bold = false,
  rotation = 0,
): PackagingLayer {
  return {
    id: crypto.randomUUID(),
    name: value.split('\n')[0].slice(0, 40),
    type: 'text',
    text: value,
    xMm: x + width / 2,
    yMm: y + height / 2,
    widthMm: width,
    heightMm: height,
    rotation,
    fontFamily: 'Arial',
    fontSizePt: pt,
    color: '#27303d',
    bold,
    italic: false,
    visible: true,
    locked: false,
  };
}

function banderole(sample: number) {
  if (sample === 1)
    return [
      block('www.musterfirma.de', 15, 17, 45, 10, 8),
      block('Lebensmittel umweltfreundlich aufbewahren', 70, 13, 100, 12, 11, true),
      block('Bienenwachstuch', 70, 28, 100, 10, 15, true),
      block('plastikfrei und bis zu 500-mal wiederverwendbar', 70, 41, 100, 10, 8),
      block('25 × 25 cm', 188, 25, 47, 16, 14, true),
    ];
  if (sample === 2)
    return [
      block(
        application + '\nMit kaltem Wasser reinigen; bei Bedarf etwas Spülmittel verwenden.',
        13,
        12,
        50,
        21,
        5.5,
      ),
      block(
        'Application\nFor covering, wrapping. Warm it slightly with your hands, place it on the bowl or fruit and press on. Do not expose to temperatures above 30 °C. Clean with cold water; if necessary use some washing-up liquid.',
        13,
        35,
        50,
        20,
        5.5,
      ),
      block('IHR LOGO', 73, 13, 96, 10, 12, true),
      block('Bienenwachstücher', 73, 27, 96, 8, 12, true),
      block(
        'Beeswax cloths\nThe alternative to cling film · reusable up to 500 times',
        73,
        38,
        96,
        10,
        7.5,
      ),
      block('www.bergtuch.de', 73, 50, 96, 5, 6),
      block(
        'Vorteile / Advantages\nNatürliche Rohstoffe: Baumwolle, Bienenwachs, Kiefernharz. Plastikfrei & nachhaltig.\nNatural raw materials: cotton, beeswax, pine resin. Plastic free & sustainable.',
        182,
        12,
        59,
        23,
        6,
      ),
      block('Anschrift\nBergtuch GmbH\nStaussbergstr. 22\n87527 Sonthofen', 182, 39, 59, 15, 6),
    ];
  return [
    block(
      'Anleitung\nCirca 1 Jahr wiederverwendbar. Kein rohes Fleisch, keinen rohen Fisch einwickeln. Vor direkter Sonneneinstrahlung schützen und nicht über 25 °C lagern.',
      13,
      12,
      50,
      20,
      6,
    ),
    block(
      'Reinigung\nUnter kaltem Wasser abspülen. Evtl. Bio-Spülmittel, sanft schrubben (kein heißes Wasser). Nicht auf der Heizung trocknen.',
      13,
      35,
      50,
      19,
      6,
    ),
    block('IHR LOGO', 73, 17, 96, 14, 16, true),
    block(slogan, 73, 41, 96, 12, 8),
    block(
      'Inhaltsstoffe\nGOTS-zertifizierte Biobaumwolle, Kiefernharz aus Portugal, Bienenwachs aus kontrolliert biologischem Anbau (kba).',
      182,
      12,
      59,
      20,
      6.5,
    ),
    block(address, 182, 36, 59, 18, 6.5),
  ];
}

function envelope(sample: number) {
  if (sample === 0)
    return [
      block('IHR LOGO', 30, 65, 130, 24, 24, true),
      block(
        'Mit Ihrem Bienenwachstuch Lebensmittel umweltfreundlich aufbewahren',
        25,
        104,
        140,
        20,
        12,
        true,
      ),
      // The lower panel folds over; its text must be upside down on the flat sheet.
      block(intro, 26, 204, 138, 22, 8, false, 180),
      block(usage, 26, 184, 138, 18, 8, false, 180),
      block(
        notes + '\nInhaltsstoffe: Biobaumwolle, Bienenwachs und Kiefernharz',
        26,
        159,
        138,
        23,
        7,
        false,
        180,
      ),
      block(address, 26, 146, 138, 12, 6, false, 180),
    ];
  const front = [
    block('IHR LOGO', 39, 40, 98, 24, 22, true),
    block('Bienenwachstücher', 39, 121, 98, 14, 16, true),
    block(slogan, 39, 140, 98, 14, 8),
  ];
  if (sample === 1)
    return [
      ...front,
      block(intro, 151, 22, 77, 33, 8),
      block(usage, 151, 59, 77, 27, 8),
      block(notes, 151, 91, 77, 39, 7.5),
      block(address, 151, 141, 77, 25, 8),
      block('www.musterfirma.de', 39, 164, 98, 8, 7),
    ];
  if (sample === 2)
    return [
      ...front,
      block(application, 151, 24, 77, 32, 8),
      block(
        'Pflege\nMit warmem Wasser und etwas Spülmittel reinigen. Im nassen Zustand nicht stark knicken. Am besten auf einem flachen Schneidebrett reinigen und trocknen.',
        151,
        62,
        77,
        33,
        8,
      ),
      block(
        'Zum Auffrischen ein paar Minuten auf Backpapier bei ca. 80 °C in den Backofen legen.',
        151,
        101,
        77,
        19,
        8,
      ),
      block(ingredients, 151, 126, 77, 18, 8),
      block(
        'Hergestellt in Deutschland\nInverkehrbringer: Bergtuch GmbH\nStrausbergstr. 22, 87527 Sonthofen',
        151,
        151,
        77,
        20,
        7,
      ),
    ];
  return [
    ...front,
    block(care, 151, 38, 77, 22, 9),
    block(ingredients, 151, 69, 77, 22, 9),
    block(application, 151, 101, 77, 42, 8.5),
    block('Hergestellt in Süddeutschland', 151, 153, 77, 15, 8),
  ];
}

function rigid(sample: number) {
  const front = [
    block('IHR LOGO', 80, 111, 105, 28, 22, true),
    block(
      sample === 1 ? 'Bienenwachstuch 25 × 25 cm' : 'Bienenwachstücher',
      80,
      185,
      105,
      20,
      14,
      true,
    ),
    block(
      sample === 0
        ? '20 × 20 / 23 × 23 / 28 × 28 cm'
        : 'nachhaltig · wiederverwendbar · plastikfrei',
      80,
      210,
      105,
      15,
      9,
    ),
    block('Die Alternative zur Frischhaltefolie', 80, 233, 105, 15, 9),
  ];
  if (sample === 2)
    return [
      ...front,
      block(intro, 80, 391, 105, 28, 9, false, 180),
      block(usage, 80, 357, 105, 28, 9, false, 180),
      block(notes, 80, 317, 105, 34, 8.5, false, 180),
      block(ingredients + '\nwww.musterfirma.de', 80, 278, 105, 30, 9, false, 180),
    ];
  return [
    ...front,
    block(care, 80, 390, 105, 26, 10, false, 180),
    block(ingredients, 80, 354, 105, 26, 10, false, 180),
    block(application, 80, 301, 105, 42, 9, false, 180),
    block('Hergestellt in Süddeutschland', 80, 275, 105, 18, 9, false, 180),
  ];
}

function carton(sample: number, inside: boolean) {
  // The inside PDF is mirrored horizontally relative to the outside die.
  const x = inside ? 65 : 116,
    w = 94;
  if (inside) {
    if (sample === 2)
      return [
        block(
          'Mit der Verwendung unserer Tücher unterstützt Du uns zusätzlich auf unserer Mission, Bienenprodukte wieder bekannter zu machen. Damit trägst Du aktiv zum Schutz der Honigbiene bei!',
          x,
          83,
          w,
          52,
          11,
        ),
        block('Pflege', x, 212, w, 14, 16, true),
        block(
          'Mit handwarmem Wasser sanft abspülen. Bitte kein heißes Wasser nutzen. Du kannst zusätzlich ein sanftes Bio-Spülmittel und einen Schwamm verwenden.',
          x,
          230,
          w,
          26,
          9,
        ),
        block(
          'Wiederaufbereitung\nAuf einem Backblech oder Rost mit Backpapier bei ca. 80 °C für fünf Minuten in den Backofen legen.',
          x,
          263,
          w,
          27,
          9,
        ),
        block(
          'Beachte!\nNicht auf dem Heizkörper trocknen oder über 30 °C lagern. Bis zu 500-mal wiederverwendbar. Vor dem ersten Gebrauch kalt abspülen. Nicht mit rohem Fleisch, Fisch, besonders fettigen Lebensmitteln oder Ananas verwenden.',
          x,
          301,
          w,
          40,
          8.5,
        ),
      ];
    return [
      block(sample === 0 ? 'TIPPS ZUR HANDHABUNG' : 'IHR LOGO', x, 50, w, 22, 16, true),
      block(
        'Anwendung\nLege dein Bienenwachstuch auf angeschnittenes Obst oder ein geöffnetes Glas. Drücke es leicht an. Durch die Wärme deiner Hände bleibt es in Form und schützt das Innere auf natürliche Weise.',
        x,
        89,
        w,
        55,
        11,
      ),
      block('Nicht zur Aufbewahrung von Fleisch oder Fisch geeignet!', x, 159, w, 20, 9),
      block('SO REINIGST DU DEINE BIENENWACHSTÜCHER', x, 208, w, 20, 12, true),
      block(
        'Mit kaltem Wasser sanft abspülen. Bitte kein heißes Wasser nutzen. Du kannst zusätzlich ein sanftes Bio-Spülmittel verwenden.',
        x,
        239,
        w,
        24,
        9,
      ),
      block(
        `Ab in den Ofen\nZum Auffrischen auf Backpapier für ${sample === 0 ? 'ein paar Minuten bei ca. 85 °C' : 'fünf Minuten bei ca. 80 °C'} in den Backofen legen.`,
        x,
        270,
        w,
        28,
        9,
      ),
      block(notes, x, 307, w, 36, 8),
    ];
  }
  if (sample === 0)
    return [
      block('BIENEN\nWACHS\nTÜCHER', 25, 44, 70, 40, 20, true),
      block(
        'Inhalt\n3 Bienenwachstücher\n20 × 20 cm · 25 × 25 cm · 30 × 30 cm',
        x,
        67,
        w,
        42,
        13,
        true,
      ),
      block('IHR LOGO', x, 137, w, 24, 18, true),
      block('www.musterfirma.de', x, 171, w, 12, 9),
      block(
        'DANKE\n… dass du unsere Welt ein Stück weit mehr von Plastik befreist!',
        x,
        265,
        w,
        45,
        12,
        true,
        180,
      ),
    ];
  return [
    block(sample === 2 ? 'Heimat' : 'Bienenwachstücher', x, 43, w, 20, 16, true),
    block(
      sample === 2
        ? 'Jedes unserer Bienenwachstücher wird aus natürlichen Rohstoffen mit viel Liebe in Sonthofen im Oberallgäu hergestellt.'
        : 'Jedes unserer Bienenwachstücher besteht aus natürlichen Rohstoffen. Neben GOTS-zertifizierter Bio-Baumwolle verwenden wir Bio-Bienenwachs und Kiefernharz. Mit viel Liebe werden die Tücher im Allgäu hergestellt.',
      x,
      70,
      w,
      36,
      9,
    ),
    block(
      'Wiederverwendbar und eine nachhaltige Alternative zu Frischhalte- und Alufolie. Sie helfen Dir, Plastik im Alltag zu vermeiden.\n\nDank der antibakteriellen Eigenschaften bleibt angeschnittenes Obst und Gemüse länger frisch.',
      x,
      114,
      w,
      44,
      9,
    ),
    block(
      sample === 2
        ? 'Inhalt\n3 Bienenwachstücher'
        : 'Inhalt\n2 Bienenwachstücher\n35 × 35 cm / 30 × 30 cm',
      25,
      142,
      70,
      36,
      10,
    ),
    block('www.musterfirma.de', x, 169, w, 12, 8),
    block(
      'Danke, dass du dich für mich als deinen Begleiter entschieden hast! Ich bin nachhaltig, wiederverwendbar und kompostierbar.',
      x,
      270,
      w,
      50,
      11,
      false,
      180,
    ),
  ];
}

export function packagingGuide(
  document: PackagingDocument,
  page = document.pages[document.selectedPage],
) {
  let name: string = document.kind;
  if (document.kind === 'carton') name = `carton-${page.face}`;
  if (document.kind === 'envelope' && page.widthMm > page.heightMm) {
    const sample = document.templateId.match(/sample-([234])$/)?.[1] ?? '2';
    name = `envelope-${sample}`;
  }
  return `${import.meta.env.BASE_URL}packaging-guides/${name}.svg`;
}

export function sourceFiles(kind: PackagingKind, sample: number): string[] {
  const n = sample + 1;
  if (kind === 'banderole')
    return [`02_Banderole/Druckstanze_Banderole_235x47mm_Beispiel_${Math.max(1, n)}.pdf`];
  if (kind === 'envelope')
    return [
      `03_Briefumschlag/Druckstanze_Briefumschlag_C6_${sample < 0 ? 'Blanko' : `Beispiel_${n}`}.pdf`,
    ];
  if (kind === 'rigid')
    return [
      `04_Verpackung_fest/Druckstanze_Verpackung_fest_${sample < 0 ? 'Blanko' : `Beispiel_${n}`}.pdf`,
    ];
  return ['Außen', 'Innen'].map(
    (face) =>
      `05_Faltschachtel/Druckstanze_Faltschachtel_${sample < 0 ? 'Blanko' : `Beispiel_${sample === 2 ? 'Obermaiselstein' : n}`}_${face}.pdf`,
  );
}

export function makePackagingDocument(kind: PackagingKind, sample = -1): PackagingDocument {
  const size = packagingTypes.find((type) => type.kind === kind)!;
  const faces = kind === 'carton' ? (['outside', 'inside'] as const) : (['front'] as const);
  return {
    kind,
    templateId: `${kind}-${sample < 0 ? 'blank' : `sample-${sample + 1}`}`,
    selectedPage: 0,
    pages: faces.map((face) => ({
      face,
      widthMm:
        kind === 'envelope' && sample > 0 ? (sample === 2 ? (698 * 25.4) / 72 : 246) : size.widthMm,
      heightMm:
        kind === 'envelope' && sample > 0
          ? sample === 2
            ? (545 * 25.4) / 72
            : 192
          : size.heightMm,
      background: '#ffffff',
      layers:
        sample < 0
          ? []
          : kind === 'banderole'
            ? banderole(sample).map((layer) => ({ ...layer, fontFamily: 'Liberation Sans' }))
            : kind === 'envelope'
              ? envelope(sample)
              : kind === 'rigid'
                ? rigid(sample)
                : carton(sample, face === 'inside'),
    })),
  };
}

export function listPackagingTemplates(kind: PackagingKind) {
  const type = packagingTypes.find((type) => type.kind === kind)!;
  return ['Leer', ...type.examples].map((name, index) => ({
    id: index === 0 ? `${kind}-blank` : `${kind}-sample-${index}`,
    name,
    sample: index - 1,
    sources: sourceFiles(kind, index - 1),
  }));
}
