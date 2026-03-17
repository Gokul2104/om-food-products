import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

/**
 * Downloads a component as a PDF
 * @param {React.MutableRefObject} contentRef - Ref to the DOM element to capture
 * @param {string} filename - Name of the file to save
 */
export const downloadAsPDF = async (contentRef, filename) => {
    if (!contentRef.current) return;

    try {
        const element = contentRef.current;

        // Use html2canvas to capture the element as an image
        // scale: 2 for better resolution
        const canvas = await html2canvas(element, {
            scale: 2,
            useCORS: true,
            backgroundColor: '#ffffff',
            logging: false,
            // Ensure the element is processed even if it's hidden in some ways
            onclone: (clonedDoc) => {
                const clonedElement = clonedDoc.querySelector('.invoice-print-container');
                if (clonedElement) {
                    clonedElement.style.display = 'block';
                    clonedElement.style.visibility = 'visible';
                }
            }
        });

        const imgData = canvas.toDataURL('image/jpeg', 1.0);

        // Calculate dimensions in mm
        // 1px = 0.264583mm at 96 dpi
        const pxToMm = 0.264583;
        const widthMm = (canvas.width / 2) * pxToMm; // Divide by 2 because scale: 2 was used
        const heightMm = (canvas.height / 2) * pxToMm;

        // Initialize PDF with custom size to fit the content exactly
        // This prevents the content from being cut off or breaking across pages
        const pdf = new jsPDF({
            orientation: 'portrait',
            unit: 'mm',
            format: [widthMm, heightMm]
        });

        pdf.addImage(imgData, 'JPEG', 0, 0, widthMm, heightMm, undefined, 'FAST');
        pdf.save(`${filename}.pdf`);
    } catch (error) {
        console.error('Error generating PDF:', error);
        alert('Failed to generate PDF. Please try again.');
    }
};
