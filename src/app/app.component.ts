import { Component, Inject, ViewChild, ElementRef } from '@angular/core';
import { getDocument, GlobalWorkerOptions, PDFDocumentProxy, PDFRenderParams, version, ViewportParameters } from 'pdfjs-dist';
import { DOCUMENT } from '@angular/common';
import { DomSanitizer } from '@angular/platform-browser';
import { PDFFilePage } from './models/PDFFilePage';
import { CdkDragDrop, moveItemInArray } from '@angular/cdk/drag-drop';
import { jsPDF, ImageOptions } from "jspdf";

@Component({
   selector: 'app-root',
   templateUrl: './app.component.html',
   styleUrls: ['./app.component.sass']
})
export class AppComponent {
   @ViewChild('inputFile') myPDFFile: ElementRef;
   private document: Document;
   public PDFFile: File;
   public PDFPage: PDFFilePage;
   public PDFPages: PDFFilePage[] = [];
   title = 'PDFViewer';
   SelectedPage; number: 1
   constructor(@Inject(DOCUMENT) document, private sanitizer: DomSanitizer) {
      this.document = document;
      const pdfWorkerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${version}/pdf.worker.min.js`;
      GlobalWorkerOptions.workerSrc = pdfWorkerSrc;
   }

   drop(event: CdkDragDrop<{ title: string, poster: string }[]>) {
      moveItemInArray(this.PDFPages, event.previousIndex, event.currentIndex);
   }

   async handleFileInput(files: FileList) {
      this.PDFPages = [];
      this.PDFPage = null;
      this.PDFFile = files.item(0);
      this.pdfToImageDataURLAsync(this.PDFFile).then((source) => {
         this.myPDFFile.nativeElement.value = '';
         this.viewPage(0);
      });

   }

   async viewPage(pageNumber: number) {
      this.SelectedPage = pageNumber;
      const originalPageNumber = this.PDFPages[pageNumber].PageNumber;
      const arrayBuffer = await new Response(this.PDFFile).arrayBuffer();
      const canvas = this.document.createElement('canvas'),
         ctx = canvas.getContext('2d') as CanvasRenderingContext2D,
         data = arrayBuffer;
      const pdf: PDFDocumentProxy = await getDocument(data).promise;
      const page = await pdf.getPage(originalPageNumber);
      const viewPortParams: ViewportParameters = { scale: 1 };
      const viewport = page.getViewport(viewPortParams);
      canvas.height = viewport.height;
      canvas.width = viewport.width;
      const renderContext: PDFRenderParams = {
         canvasContext: ctx,
         viewport: viewport
      };
      const renderedPage = await page.render(renderContext).promise;
      const res = canvas.toDataURL();
      this.PDFPage = {
         PageNumber: 0,
         PageThumnail: this.sanitizer.bypassSecurityTrustResourceUrl(res)
      }
      if (pdf != null) pdf.destroy();
   }

   // async viewpDFPage(pageNumber: number) {
   //   this.SelectedPage = pageNumber;
   //   const originalPageNumber = this.PDFPages[pageNumber].PageNumber;
   //   const arrayBuffer = await new Response(this.PDFFile).arrayBuffer();
   //   const canvas = this.document.createElement('canvas'),
   //     ctx = canvas.getContext('2d') as CanvasRenderingContext2D,
   //     data = arrayBuffer;

   //   const pdf: PDFDocumentProxy = await getDocument(data).promise;

   //   const page = await pdf.getPage(originalPageNumber);
   //   this.renderPage(page);
   // }

   // async renderPage(page) {
   //   const viewport = document.querySelector("#viewport");
   //   viewport.innerHTML = `<div><canvas></canvas></div>`;
   //   let pdfViewport = page.getViewport({ scale: 1 });

   //   const container = viewport.children[0] as HTMLElement;

   //   // Render at the page size scale.
   //   pdfViewport = page.getViewport({ scale: container.offsetWidth / pdfViewport.width});
   //   const canvas = container.children[0] as HTMLCanvasElement;
   //   const context = canvas.getContext("2d");
   //   canvas.height = pdfViewport.height;
   //   canvas.width = pdfViewport.width;

   //   page.render({
   //     canvasContext: context,
   //     viewport: pdfViewport
   //   }).then(function() {
   //     return page.getTextContent();
   //   }).then(function(textContent) {
   //     // Create div which will hold text-fragments
   //     var textLayerDiv = document.createElement("div");

   //     // Set it's class to textLayer which have required CSS styles
   //     textLayerDiv.setAttribute("class", "textLayer");
   //     var div = document.createElement("div");

   //     // Set id attribute with page-#{pdf_page_number} format
   //     div.setAttribute("id", "page-" + (page.pageIndex + 1));

   //     // This will keep positions of child elements as per our needs
   //     div.setAttribute("style", "position: relative");
   //     // Append newly created div in `div#page-#{pdf_page_number}`
   //     div.appendChild(textLayerDiv);

   //     // Create new instance of TextLayerBuilder class
   //     var textLayer = new TextLayerBuilder({
   //       textLayerDiv: textLayerDiv, 
   //       pageIndex: page.pageIndex,
   //       viewport: viewport
   //     });

   //     // Set text-fragments
   //     textLayer.setTextContent(textContent);

   //     // Render text-fragments
   //     textLayer.render();
   //   });;
   // }

   async pdfToImageDataURLAsync(pdfFile: File): Promise<string> {
      const arrayBuffer = await new Response(pdfFile).arrayBuffer();
      const canvas = this.document.createElement('canvas'),
         ctx = canvas.getContext('2d') as CanvasRenderingContext2D,
         data = arrayBuffer;
      const pdf: PDFDocumentProxy = await getDocument(data).promise;
      const totalPages = pdf.numPages;
      for (let i = 1; i <= totalPages; i++) {
         const page = await pdf.getPage(i);
         const viewPortParams: ViewportParameters = { scale: 1 };
         const viewport = page.getViewport(viewPortParams);
         var scalesize = 0.15;
         canvas.height = viewport.height * scalesize;
         canvas.width = viewport.width * scalesize;
         var scale = Math.min(canvas.width / viewport.width, canvas.height / viewport.height);
         const viewPortParamsActual: ViewportParameters = { scale: scale };
         const renderContext: PDFRenderParams = {
            canvasContext: ctx,
            viewport: page.getViewport(viewPortParamsActual)
         };
         const renderedPage = await page.render(renderContext).promise;
         const res = canvas.toDataURL();
         this.PDFPages.push(
            {
               PageNumber: i,
               PageThumnail: this.sanitizer.bypassSecurityTrustResourceUrl(res)
            });
      }
      if (pdf != null) pdf.destroy();
      return "true";
   }

   async loadFile() {
      this.myPDFFile.nativeElement.click();
   }

   async downloadFile() {
      const doc = new jsPDF('p', 'pt');
      const arrayBuffer = await new Response(this.PDFFile).arrayBuffer();
      const canvas = this.document.createElement('canvas'),
         ctx = canvas.getContext('2d') as CanvasRenderingContext2D,
         data = arrayBuffer;
      const pdf: PDFDocumentProxy = await getDocument(data).promise;
      const viewPortParams: ViewportParameters = { scale: 1 };
      for (let i = 0; i < this.PDFPages.length; i++) {
         const originalPageNumber = this.PDFPages[i].PageNumber;
         const page = await pdf.getPage(originalPageNumber);
         const viewport = page.getViewport(viewPortParams);
         canvas.height = viewport.height;
         canvas.width = viewport.width;
         const renderContext: PDFRenderParams = {
            canvasContext: ctx,
            viewport: viewport
         };
         const renderedPage = await page.render(renderContext).promise;
         const imageOption: ImageOptions = {
            imageData: canvas,
            height: viewport.height,
            width: viewport.width,
            x: 0,
            y: 0
         }
         doc.addImage(imageOption);
         if (i != this.PDFPages.length - 1) {
            doc.addPage("a4", "p");
         }
      }

      if (pdf != null) pdf.destroy();
      doc.save(this.PDFFile.name);
   }

   
   
   async delteme(pageNumber) {
      this.PDFPages.splice(pageNumber, 1);
      if (this.PDFPages.length > 1) {
         if (this.SelectedPage == pageNumber) {
            if (pageNumber == this.PDFPages.length - 1)
               this.viewPage(0);
            else
               this.viewPage(pageNumber + 1);
         }
      }
      else {
         this.PDFPage = null;
      }
   }
}


