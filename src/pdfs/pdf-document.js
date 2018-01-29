import pdfMake from 'pdfmake/build/pdfmake';
import pdfMakeFonts from './vfs-fonts';

/* Set PDF Make virtual file system with Base64 font files. */
pdfMake.vfs = pdfMakeFonts;
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
