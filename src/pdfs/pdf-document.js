import pdfMake from 'pdfmake/build/pdfmake';

/* Asynchronically download base64 font files bundle for PDF Make. */
fetch('vfs-fonts.bundle.json')
  .then(response => response.json())
  .then(pdfMakeFonts => pdfMake.vfs = pdfMakeFonts);

pdfMake.fonts = {
  Roboto: {
    normal: 'Roboto-Regular.ttf',
    bold: 'Roboto-Medium.ttf',
    italics: 'Roboto-Italic.ttf',
    bolditalics: 'Roboto-MediumItalic.ttf'
  },
  WenQuanYiZenHei: {
    normal: 'WenQuanYiZenHei.ttf',
    bold: 'WenQuanYiZenHei.ttf',
    italics: 'WenQuanYiZenHei.ttf',
    bolditalics: 'WenQuanYiZenHei.ttf'
  },
  ElMassiri: {
    normal: 'ElMessiri-Regular.ttf',
    bold: 'ElMessiri-Regular.ttf',
    italics: 'ElMessiri-Regular.ttf',
    bolditalics: 'ElMessiri-Regular.ttf'
  }
};

export class PdfDocument {
  constructor(filename) {
    this.filename = filename;
  }

  download() {
    const pdf = pdfMake.createPdf(this.definition);
    return new Promise(resolve => pdf.download(this.filename, resolve))
  }
}
