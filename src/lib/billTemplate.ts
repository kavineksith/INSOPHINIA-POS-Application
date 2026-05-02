export interface BillTemplateData {
  billNumber: string;
  customerName: string;
  customerEmail?: string;
  customerPhone?: string;
  customerAddress?: string;
  staffName: string;
  startTime: Date;
  endTime?: Date;
  subtotal: number;
  totalDiscount: number;
  vatAmount?: number;
  ssclAmount?: number;
  taxTotal?: number;
  totalAmount: number;
  paidAmount: number;
  balance: number;
  status: string;
  items: Array<{
    itemName: string;
    quantity: number;
    unit: string;
    unitPrice: number;
    discount: number;
    subtotal: number;
  }>;
  earnedPoints?: number;
  pointsRedeemed?: number;
  pointsValue?: number;
  pointsAuthorizedBy?: string;
  totalPointsAfter?: number;
}

export interface ShopData {
  name: string;
  address: string;
  phone: string;
  logo?: string;
}

export function generateBillHtml(bill: BillTemplateData, shop: ShopData): string {
  const primaryColor = '#6366f1';
  const secondaryColor = '#8b5cf6';
  const textColor = '#1e293b';
  const mutedColor = '#64748b';
  const borderColor = '#e2e8f0';

  const itemsHtml = bill.items.map((item, index) => `
    <tr style="background-color: ${index % 2 === 0 ? '#ffffff' : '#f8fafc'};">
      <td style="padding: 12px; border-bottom: 1px solid ${borderColor}; font-size: 14px; color: ${textColor}; text-align: left;">
        <strong>${item.itemName}</strong>
      </td>
      <td style="padding: 12px; border-bottom: 1px solid ${borderColor}; font-size: 14px; color: ${textColor}; text-align: center;">
        ${Number(item.quantity).toFixed(3).replace(/\.?0+$/, '')} <span style="font-size: 11px; color: ${mutedColor};">${item.unit}</span>
      </td>
      <td style="padding: 12px; border-bottom: 1px solid ${borderColor}; font-size: 14px; color: ${textColor}; text-align: right;">
        Rs. ${item.unitPrice.toFixed(2)}
      </td>
      <td style="padding: 12px; border-bottom: 1px solid ${borderColor}; font-size: 14px; color: ${item.discount > 0 ? '#ef4444' : textColor}; text-align: right;">
        ${item.discount > 0 ? `-Rs. ${item.discount.toFixed(2)}` : '-'}
      </td>
      <td style="padding: 12px; border-bottom: 1px solid ${borderColor}; font-size: 14px; color: ${textColor}; font-weight: 600; text-align: right;">
        Rs. ${item.subtotal.toFixed(2)}
      </td>
    </tr>
  `).join('');

  const formatDate = (date: Date) => {
    return date.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
  };

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });
  };

  const billDate = formatDate(new Date(bill.startTime));
  const billTimeStart = formatTime(new Date(bill.startTime));
  const billTimeEnd = bill.endTime ? formatTime(new Date(bill.endTime)) : 'N/A';
  const generationTime = new Date().toLocaleString('en-GB');

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Bill ${bill.billNumber}</title>
  <style>
    @media print {
      @page { size: A4; margin: 0; }
      body { margin: 0; padding: 0 !important; background-color: #fff !important; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
      .no-print { display: none; }
      .bill-container { 
        box-shadow: none !important; 
        border: none !important; 
        max-width: 100% !important; 
        margin: 0 !important;
        border-radius: 0 !important;
      }
      tr, .totals-section, .footer-message { page-break-inside: avoid; break-inside: avoid; }
    }
  </style>
</head>
<body style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; margin: 0; padding: 20px; background-color: #f8fafc; color: ${textColor}; line-height: 1.4;">
  
  <div class="bill-container" style="max-width: 800px; margin: 0 auto; background-color: #fff; border: 1px solid ${borderColor}; border-radius: 12px; box-shadow: 0 5px 15px rgba(0,0,0,0.05);">
    
    <!-- Colorful Header Overlay -->
    <div style="background: linear-gradient(135deg, ${primaryColor}, ${secondaryColor}); height: 6px;"></div>
    
    <div style="padding: 40px;">
      <!-- Header Section -->
      <table style="width: 100%; border-collapse: collapse; margin-bottom: 40px;">
        <tr>
          <td style="vertical-align: top;">
            <h1 style="margin: 0; font-size: 28px; color: ${primaryColor}; text-transform: uppercase; letter-spacing: 1px;">${shop.name}</h1>
            <p style="margin: 5px 0 0 0; font-size: 14px; color: ${mutedColor}; white-space: pre-line;">
              ${shop.address}
              Phone: ${shop.phone}
            </p>
          </td>
          <td style="vertical-align: top; text-align: right;">
            <div style="display: inline-block; background-color: #f1f5f9; padding: 10px 20px; border-radius: 12px; text-align: right;">
              <span style="font-size: 11px; text-transform: uppercase; color: ${mutedColor}; font-weight: 700; letter-spacing: 0.5px;">Invoice Number</span><br>
              <span style="font-size: 20px; font-weight: 700; color: ${textColor}; font-family: 'Courier New', Courier, monospace;">#${bill.billNumber}</span>
            </div>
          </td>
        </tr>
      </table>

      <!-- Status Bar -->
      <div style="background-color: ${bill.status === 'completed' ? '#ecfdf5' : '#fff7ed'}; border-left: 4px solid ${bill.status === 'completed' ? '#10b981' : '#f59e0b'}; padding: 12px 20px; margin-bottom: 30px; border-radius: 4px;">
        <span style="font-size: 14px; font-weight: 600; color: ${bill.status === 'completed' ? '#065f46' : '#9a3412'}; text-transform: uppercase;">
          Status: ${bill.status}
        </span>
      </div>

      <!-- Info Grid -->
      <table style="width: 100%; border-collapse: collapse; margin-bottom: 40px;">
        <tr>
          <td style="width: 50%; vertical-align: top; padding-right: 20px;">
            <h3 style="margin: 0 0 10px 0; font-size: 11px; text-transform: uppercase; color: ${mutedColor}; letter-spacing: 1px; font-weight: 700;">Customer Details</h3>
            <p style="margin: 0; font-size: 16px; font-weight: 600;">${bill.customerName}</p>
            ${bill.customerEmail ? `<p style="margin: 2px 0 0 0; font-size: 14px; color: ${mutedColor};">${bill.customerEmail}</p>` : ''}
            ${bill.customerPhone ? `<p style="margin: 2px 0 0 0; font-size: 14px; color: ${mutedColor};">${bill.customerPhone}</p>` : ''}
          </td>
          <td style="width: 50%; vertical-align: top; text-align: right;">
            <div style="display: inline-block; text-align: left; min-width: 200px;">
              <h3 style="margin: 0 0 10px 0; font-size: 11px; text-transform: uppercase; color: ${mutedColor}; letter-spacing: 1px; font-weight: 700;">Bill Information</h3>
              <table style="width: 100%; font-size: 14px;">
                <tr><td style="color: ${mutedColor}; padding: 3px 0;">Date:</td><td style="font-weight: 600; text-align: right;">${billDate}</td></tr>
                <tr><td style="color: ${mutedColor}; padding: 3px 0;">Cashier:</td><td style="font-weight: 600; text-align: right;">${bill.staffName}</td></tr>
                <tr><td style="color: ${mutedColor}; padding: 3px 0;">Start Time:</td><td style="font-weight: 600; text-align: right;">${billTimeStart}</td></tr>
                <tr><td style="color: ${mutedColor}; padding: 3px 0;">End Time:</td><td style="font-weight: 600; text-align: right;">${billTimeEnd}</td></tr>
              </table>
            </div>
          </td>
        </tr>
      </table>

      <!-- Items Table -->
      <div style="border: 1px solid ${borderColor}; border-radius: 12px; overflow: hidden; margin-bottom: 30px;">
        <table style="width: 100%; border-collapse: collapse;">
          <thead>
            <tr style="background-color: #f8fafc;">
              <th style="padding: 14px 12px; text-align: left; font-size: 11px; text-transform: uppercase; color: ${mutedColor}; border-bottom: 2px solid ${borderColor}; letter-spacing: 0.5px; font-weight: 700;">Item Description</th>
              <th style="padding: 14px 12px; text-align: center; font-size: 11px; text-transform: uppercase; color: ${mutedColor}; border-bottom: 2px solid ${borderColor}; letter-spacing: 0.5px; font-weight: 700;">Qty</th>
              <th style="padding: 14px 12px; text-align: right; font-size: 11px; text-transform: uppercase; color: ${mutedColor}; border-bottom: 2px solid ${borderColor}; letter-spacing: 0.5px; font-weight: 700;">Unit Price</th>
              <th style="padding: 14px 12px; text-align: right; font-size: 11px; text-transform: uppercase; color: ${mutedColor}; border-bottom: 2px solid ${borderColor}; letter-spacing: 0.5px; font-weight: 700;">Discount</th>
              <th style="padding: 14px 12px; text-align: right; font-size: 11px; text-transform: uppercase; color: ${mutedColor}; border-bottom: 2px solid ${borderColor}; letter-spacing: 0.5px; font-weight: 700;">Subtotal</th>
            </tr>
          </thead>
          <tbody>
            ${itemsHtml}
          </tbody>
        </table>
      </div>

      <!-- Totals Section -->
      <table style="width: 100%; border-collapse: collapse;">
        <tr>
          <td style="width: 55%; vertical-align: bottom; padding-bottom: 5px;">
             ${bill.status === 'returned' ? '<div style="color: #f59e0b; font-size: 12px; font-style: italic;">* This bill contains returned items.</div>' : ''}
          </td>
          <td style="width: 45%;">
            <table style="width: 100%; border-collapse: collapse; font-size: 15px;">
              <tr>
                <td style="padding: 10px 0; color: ${mutedColor};">Subtotal</td>
                <td style="padding: 10px 0; text-align: right; font-weight: 600;">Rs. ${bill.subtotal.toFixed(2)}</td>
              </tr>
              <tr>
                <td style="padding: 10px 0; color: ${mutedColor}; border-bottom: 1px solid ${borderColor};">Total Discount</td>
                <td style="padding: 10px 0; text-align: right; font-weight: 600; color: #ef4444; border-bottom: 1px solid ${borderColor};">-Rs. ${bill.totalDiscount.toFixed(2)}</td>
              </tr>
              ${bill.vatAmount && bill.vatAmount > 0 ? `
              <tr>
                <td style="padding: 8px 0; color: ${mutedColor}; font-size: 13px;">VAT (18%)</td>
                <td style="padding: 8px 0; text-align: right; font-weight: 600; font-size: 13px;">+Rs. ${bill.vatAmount.toFixed(2)}</td>
              </tr>
              ` : ''}
              ${bill.ssclAmount && bill.ssclAmount > 0 ? `
              <tr>
                <td style="padding: 8px 0; color: ${mutedColor}; font-size: 13px;">SSCL (2.5%)</td>
                <td style="padding: 8px 0; text-align: right; font-weight: 600; font-size: 13px;">+Rs. ${bill.ssclAmount.toFixed(2)}</td>
              </tr>
              ` : ''}
              ${bill.taxTotal && bill.taxTotal > 0 ? `
              <tr>
                <td style="padding: 8px 0; color: ${mutedColor}; font-size: 13px; border-bottom: 1px dashed ${borderColor};">Tax Total</td>
                <td style="padding: 8px 0; text-align: right; font-weight: 700; font-size: 13px; border-bottom: 1px dashed ${borderColor};">+Rs. ${bill.taxTotal.toFixed(2)}</td>
              </tr>
              ` : ''}
              <tr style="font-size: 20px;">
                <td style="padding: 20px 0; color: ${textColor}; font-weight: 800;">Total Amount</td>
                <td style="padding: 20px 0; text-align: right; font-weight: 800; color: ${primaryColor};">Rs. ${bill.totalAmount.toFixed(2)}</td>
              </tr>
              ${bill.pointsRedeemed && bill.pointsRedeemed > 0 ? `
              <tr>
                <td style="padding: 10px 0; color: #b45309; font-weight: 700;">* Points Redeemed</td>
                <td style="padding: 10px 0; text-align: right; font-weight: 800; color: #b45309;">-${bill.pointsRedeemed} pts (Rs. ${bill.pointsValue?.toFixed(2)})</td>
              </tr>
              ${bill.pointsAuthorizedBy ? `
              <tr>
                <td style="padding: 0 0 10px 0; color: #92400e; font-size: 11px; text-align: right;" colspan="2">Authorized by: ${bill.pointsAuthorizedBy}</td>
              </tr>
              ` : ''}
              ` : ''}
              <tr>
                <td style="padding: 8px 0; color: ${mutedColor};">Paid Amount</td>
                <td style="padding: 8px 0; text-align: right; font-weight: 600;">Rs. ${bill.paidAmount.toFixed(2)}</td>
              </tr>
              <tr>
                <td style="padding: 8px 0; color: ${mutedColor};">Balance</td>
                <td style="padding: 8px 0; text-align: right; font-weight: 700; color: ${bill.balance >= 0 ? '#10b981' : '#ef4444'};">Rs. ${bill.balance.toFixed(2)}</td>
              </tr>
              ${bill.earnedPoints ? `
              <tr>
                <td style="padding: 15px 0 5px 0; color: #b45309; font-weight: 700; border-top: 1px dashed #fcd34d;">* Points Earned</td>
                <td style="padding: 15px 0 5px 0; text-align: right; font-weight: 800; color: #b45309; border-top: 1px dashed #fcd34d;">${bill.earnedPoints} pts</td>
              </tr>
              ` : ''}
              ${bill.totalPointsAfter ? `
              <tr>
                <td style="padding: 5px 0; color: #64748b; font-size: 12px;">New Total Balance</td>
                <td style="padding: 5px 0; text-align: right; font-weight: 600; color: #64748b; font-size: 12px;">${bill.totalPointsAfter} pts</td>
              </tr>
              ` : ''}
            </table>
          </td>
        </tr>
      </table>

      <!-- Footer Message -->
      <div class="footer-message" style="margin-top: 40px; padding-top: 20px; border-top: 2px dashed ${borderColor}; text-align: center;">
        <h2 style="margin: 0; color: ${secondaryColor}; font-size: 20px; font-weight: 700;">Thank You for Shopping!</h2>
        <p style="margin: 5px 0 0 0; color: ${mutedColor}; font-size: 14px; font-weight: 500;">Visit us again soon at ${shop.name}.</p>
        
        <div style="margin-top: 40px; display: flex; justify-content: center; gap: 20px;">
          <small style="color: ${mutedColor}; font-size: 11px;">
            Bill Generated On: ${generationTime}
          </small>
          <small style="color: ${mutedColor}; font-size: 11px;"> • </small>
          <small style="color: ${mutedColor}; font-size: 11px;">
            Powered by INSOPHINIA POS
          </small>
        </div>
      </div>
    </div>
  </div>
</body>
</html>
  `;
}

export function generateThermalReceiptHtml(bill: BillTemplateData, shop: ShopData): string {
  const formatDate = (date: Date) => {
    return date.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
  };

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false });
  };

  const billDate = formatDate(new Date(bill.startTime));
  const billTimeStart = formatTime(new Date(bill.startTime));
  const billTimeEnd = bill.endTime ? formatTime(new Date(bill.endTime)) : 'N/A';

  const itemsHtml = bill.items.map(item => `
        <div class="item-row">
            <div class="col-name">${item.itemName.toUpperCase()}</div>
            <div class="col-price">${item.unitPrice.toFixed(2)}</div>
            <div class="col-qty">${Number(item.quantity).toFixed(3).replace(/\.?0+$/, '')} <span style="font-size:9px">${item.unit}</span></div>
            <div class="col-total">${item.subtotal.toFixed(2)}</div>
        </div>
    `).join('');

  return `
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Receipt ${bill.billNumber}</title>
    <style>
        body {
            font-family: 'Courier New', Courier, monospace;
            width: 300px;
            margin: 0 auto;
            padding: 10px;
            font-size: 11px;
            line-height: 1.2;
            color: #000;
            background-color: #fff;
        }
        .center { text-align: center; }
        .bold { font-weight: bold; }
        
        .header { margin-bottom: 10px; }
        .shop-name { font-size: 16px; font-weight: bold; margin-bottom: 2px; }
        .shop-info { font-size: 11px; margin-bottom: 2px; }
        
        .divider { border-top: 1px dashed #000; margin: 8px 0; }
        
        .meta-grid { display: flex; justify-content: space-between; font-size: 11px; margin-bottom: 2px; }
        
        .table-header { display: flex; font-weight: bold; margin-bottom: 4px; font-size: 11px; border-bottom: 1px dashed #000; padding-bottom: 4px; }
        .item-row { display: flex; justify-content: space-between; margin-bottom: 4px; align-items: flex-start; }
        
        .col-name { width: 35%; text-align: left; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
        .col-price { width: 20%; text-align: right; }
        .col-qty { width: 15%; text-align: center; }
        .col-total { width: 30%; text-align: right; }
        
        .totals-section { margin-top: 5px; }
        .total-row { display: flex; justify-content: space-between; margin-bottom: 2px; font-size: 11px; }
        .grand-total { font-size: 14px; font-weight: bold; margin-top: 5px; padding-top: 5px; border-top: 1px solid #000; }
        
        .footer { margin-top: 15px; font-size: 9px; border-top: 1px dashed #000; padding-top: 8px; }
        
        @media print {
            body { width: 100%; padding: 0; margin: 0; }
            @page { margin: 0; }
        }
    </style>
</head>
<body>
    <div class="center header">
        <div class="shop-name">${shop.name}</div>
        <div class="shop-info">${shop.address}</div>
        <div class="shop-info">Phone: ${shop.phone}</div>
    </div>

    <div class="divider"></div>

    <div class="meta-grid bold">
        <span>INVOICE - PAID</span>
        <span># ${bill.billNumber}</span>
    </div>

    <div class="divider"></div>

    <div class="meta-grid">
        <span>Date: ${billDate}</span>
        <span>Start: ${billTimeStart}</span>
    </div>
    <div class="meta-grid">
        <span>Cashier: ${bill.staffName.toUpperCase()}</span>
        <span>End: ${billTimeEnd}</span>
    </div>

    <div class="divider"></div>

    <div class="table-header">
        <span style="width: 35%;">Product</span>
        <span style="width: 20%; text-align: right;">Price</span>
        <span style="width: 15%; text-align: center;">Qty.</span>
        <span style="width: 30%; text-align: right;">Total</span>
    </div>

    ${itemsHtml}

    <div class="divider"></div>

    <div class="totals-section">
        <div class="total-row">
            <span>Sub Total</span>
            <span>${bill.subtotal.toFixed(2)}</span>
        </div>
        ${bill.totalDiscount > 0 ? `
        <div class="total-row">
            <span>Discount</span>
            <span>-${bill.totalDiscount.toFixed(2)}</span>
        </div>
        ` : ''}
        ${bill.vatAmount && bill.vatAmount > 0 ? `
        <div class="total-row" style="font-size: 10px;">
            <span>VAT (18%)</span>
            <span>+${bill.vatAmount.toFixed(2)}</span>
        </div>
        ` : ''}
        ${bill.ssclAmount && bill.ssclAmount > 0 ? `
        <div class="total-row" style="font-size: 10px;">
            <span>SSCL (2.5%)</span>
            <span>+${bill.ssclAmount.toFixed(2)}</span>
        </div>
        ` : ''}
        <div class="total-row grand-total">
            <span>Total</span>
            <span>${bill.totalAmount.toFixed(2)}</span>
        </div>
        ${bill.pointsRedeemed && bill.pointsRedeemed > 0 ? `
        <div class="total-row" style="color: #b45309; font-weight: bold;">
            <span>* POINTS REDEEMED</span>
            <span>-${bill.pointsRedeemed}</span>
        </div>
        ${bill.pointsAuthorizedBy ? `
        <div class="total-row" style="font-size: 9px; color: #b45309; text-align: right;">
            <span>Auth by: ${bill.pointsAuthorizedBy.toUpperCase()}</span>
        </div>
        ` : ''}
        ` : ''}
        <div class="divider"></div>
        <div class="total-row">
            <span>Cash Amount</span>
            <span>${bill.paidAmount.toFixed(2)}</span>
        </div>
        <div class="total-row">
            <span>Cash Balance</span>
            <span>${bill.balance.toFixed(2)}</span>
        </div>
        ${bill.earnedPoints ? `
        <div class="divider"></div>
        <div class="total-row bold" style="color: #000;">
            <span>* POINTS EARNED</span>
            <span>${bill.earnedPoints}</span>
        </div>
        ` : ''}
        ${bill.totalPointsAfter ? `
        <div class="total-row" style="font-size: 10px;">
            <span>TOTAL POINTS</span>
            <span>${bill.totalPointsAfter}</span>
        </div>
        ` : ''}
    </div>

    <div class="center footer">
        <div class="bold">THANKS FOR CHOOSING US!</div>
        <div>See you again soon!</div>
        <div style="margin-top: 10px; font-size: 8px;">Software Developed by INSOPHINIA POS</div>
        <div style="font-size: 8px;">www.insophinia.lk | +94 123 456 789</div>
    </div>

    <script>
        // Auto-print with fallback for mobile browsers
        if (document.readyState === 'complete') {
            setTimeout(function() { window.print(); }, 300);
        } else {
            window.addEventListener('load', function() {
                setTimeout(function() { window.print(); }, 300);
            });
        }
    </script>
</body>
</html>
`;
}
