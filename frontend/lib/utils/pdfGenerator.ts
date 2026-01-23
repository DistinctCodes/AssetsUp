import { Asset } from '@/lib/query/types/asset';

/**
 * Generates a printable PDF label for an asset
 * Includes QR code, asset ID, name, serial number, and department
 */
export async function generateAssetLabelPDF(asset: Asset): Promise<void> {
  // Dynamic imports for client-side only
  const { jsPDF } = await import('jspdf');
  const QRCode = (await import('qrcode')).default;

  // Create PDF with label dimensions (80mm x 50mm)
  const doc = new jsPDF({
    orientation: 'landscape',
    unit: 'mm',
    format: [50, 80],
  });

  // Generate QR Code as data URL
  const qrUrl =
    asset.qrCode ||
    `${process.env.NEXT_PUBLIC_APP_URL || window.location.origin}/assets/${asset.id}`;
  const qrDataUrl = await QRCode.toDataURL(qrUrl, {
    width: 200,
    margin: 1,
    color: {
      dark: '#000000',
      light: '#ffffff',
    },
  });

  // Add QR Code (left side)
  doc.addImage(qrDataUrl, 'PNG', 3, 3, 22, 22);

  // Add text content (right side)
  const textStartX = 28;
  let currentY = 6;

  // Asset Name (bold, larger)
  doc.setFontSize(9);
  doc.setFont('helvetica', 'bold');
  const nameLines = doc.splitTextToSize(asset.name, 48);
  doc.text(nameLines, textStartX, currentY);
  currentY += nameLines.length * 3.5 + 1;

  // Asset ID
  doc.setFontSize(7);
  doc.setFont('helvetica', 'normal');
  doc.text(`ID: ${asset.assetId}`, textStartX, currentY);
  currentY += 3.5;

  // Serial Number
  if (asset.serialNumber) {
    doc.text(`S/N: ${asset.serialNumber}`, textStartX, currentY);
    currentY += 3.5;
  }

  // Department
  if (asset.department?.name) {
    doc.text(`Dept: ${asset.department.name}`, textStartX, currentY);
    currentY += 3.5;
  }

  // Location
  if (asset.location) {
    const locationText = `Loc: ${asset.location}`;
    const locationLines = doc.splitTextToSize(locationText, 48);
    doc.text(locationLines, textStartX, currentY);
  }

  // Add a border around the label
  doc.setDrawColor(200, 200, 200);
  doc.setLineWidth(0.3);
  doc.rect(1, 1, 78, 48);

  // Save the PDF
  const fileName = `${asset.assetId}-label.pdf`;
  doc.save(fileName);
}

/**
 * Generates a full asset report PDF with all details
 */
export async function generateAssetReportPDF(asset: Asset): Promise<void> {
  const { jsPDF } = await import('jspdf');
  const QRCode = (await import('qrcode')).default;

  const doc = new jsPDF();
  let currentY = 20;

  // Title
  doc.setFontSize(20);
  doc.setFont('helvetica', 'bold');
  doc.text('Asset Report', 105, currentY, { align: 'center' });
  currentY += 15;

  // Asset Name and ID
  doc.setFontSize(16);
  doc.text(asset.name, 20, currentY);
  currentY += 8;

  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.text(`Asset ID: ${asset.assetId}`, 20, currentY);
  currentY += 15;

  // QR Code
  const qrUrl =
    asset.qrCode ||
    `${process.env.NEXT_PUBLIC_APP_URL || window.location.origin}/assets/${asset.id}`;
  const qrDataUrl = await QRCode.toDataURL(qrUrl, { width: 200 });
  doc.addImage(qrDataUrl, 'PNG', 150, 25, 40, 40);

  // Details section
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.text('Details', 20, currentY);
  currentY += 8;

  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');

  const details = [
    ['Status', asset.status],
    ['Condition', asset.condition],
    ['Category', asset.category?.name || '-'],
    ['Department', asset.department?.name || '-'],
    ['Location', asset.location || '-'],
    ['Assigned To', asset.assignedTo?.name || '-'],
    ['Serial Number', asset.serialNumber || '-'],
    ['Manufacturer', asset.manufacturer || '-'],
    ['Model', asset.model || '-'],
    [
      'Purchase Date',
      asset.purchaseDate
        ? new Date(asset.purchaseDate).toLocaleDateString()
        : '-',
    ],
    [
      'Purchase Price',
      asset.purchasePrice ? `$${asset.purchasePrice.toLocaleString()}` : '-',
    ],
    [
      'Current Value',
      asset.currentValue ? `$${asset.currentValue.toLocaleString()}` : '-',
    ],
    [
      'Warranty Expires',
      asset.warrantyExpiration
        ? new Date(asset.warrantyExpiration).toLocaleDateString()
        : '-',
    ],
  ];

  details.forEach(([label, value]) => {
    doc.setFont('helvetica', 'bold');
    doc.text(`${label}:`, 20, currentY);
    doc.setFont('helvetica', 'normal');
    doc.text(String(value), 70, currentY);
    currentY += 6;
  });

  // Description
  if (asset.description) {
    currentY += 5;
    doc.setFont('helvetica', 'bold');
    doc.text('Description:', 20, currentY);
    currentY += 6;
    doc.setFont('helvetica', 'normal');
    const descLines = doc.splitTextToSize(asset.description, 170);
    doc.text(descLines, 20, currentY);
    currentY += descLines.length * 5;
  }

  // Notes
  if (asset.notes) {
    currentY += 5;
    doc.setFont('helvetica', 'bold');
    doc.text('Notes:', 20, currentY);
    currentY += 6;
    doc.setFont('helvetica', 'normal');
    const notesLines = doc.splitTextToSize(asset.notes, 170);
    doc.text(notesLines, 20, currentY);
  }

  // Footer
  doc.setFontSize(8);
  doc.setTextColor(128, 128, 128);
  doc.text(
    `Generated on ${new Date().toLocaleDateString()} at ${new Date().toLocaleTimeString()}`,
    105,
    285,
    { align: 'center' }
  );

  // Save
  doc.save(`${asset.assetId}-report.pdf`);
}
