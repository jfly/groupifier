import pdfMake from 'pdfmake/build/pdfmake';
import pdfMakeFonts from 'pdfmake/build/vfs_fonts';
/* Workaround, see: https://github.com/bpampuch/pdfmake/issues/910#issuecomment-311824467 */
pdfMake.vfs = pdfMakeFonts.pdfMake.vfs;

export class PdfDocument {
  constructor(filename) {
    this.filename = filename;
  }

  download() {
    const pdf = pdfMake.createPdf(this.definition);
    return new Promise(resolve => pdf.download(this.filename, resolve))
  }
}
