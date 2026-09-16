/**
 * Default RECEIPT_80 template used as API fallback and builder reset.
 */
export function createDefaultReceiptBlocks() {
  return [
    {
      id: 'hdr-1',
      type: 'HEADER',
      enabled: true,
      props: {
        shopName: 'POS Shop',
        shopNameAr: 'متجر نقاط البيع',
        address: '',
        addressAr: '',
        phone: ''
      }
    },
    {
      id: 'meta-1',
      type: 'META',
      enabled: true,
      props: {}
    },
    {
      id: 'items-1',
      type: 'ITEMS',
      enabled: true,
      props: { showDiscount: true }
    },
    {
      id: 'totals-1',
      type: 'TOTALS',
      enabled: true,
      props: {}
    },
    {
      id: 'pay-1',
      type: 'PAYMENT',
      enabled: true,
      props: {}
    },
    {
      id: 'custom-1',
      type: 'CUSTOM_TEXT',
      enabled: false,
      props: { textEn: '', textAr: '' }
    },
    {
      id: 'footer-1',
      type: 'FOOTER',
      enabled: true,
      props: {
        footerEn: 'Thank you for your visit',
        footerAr: 'شكراً لزيارتكم'
      }
    }
  ]
}

export function createDefaultReceiptTemplate() {
  return {
    code: 'RECEIPT_80',
    nameEn: 'Receipt 80mm',
    nameAr: 'فاتورة 80مم',
    templateType: 'RECEIPT_80',
    paperWidthMm: 80,
    blocks: createDefaultReceiptBlocks()
  }
}

/** Sample receipt used in the builder live preview. */
export function createSampleReceiptData() {
  return {
    details: {
      receiptId: 'sample-receipt',
      customerName: 'Walk-in',
      employeeName: 'Cashier',
      receiptDate: '2026-08-12T14:30:00',
      receiptTime: '14:30:00',
      total: 24.5,
      currency: 0,
      receiptDiscount: 5,
      isReceiptDiscountPercent: true,
      payWish: 0,
      isPayWishDollar: true,
      payDollar: 20,
      payLebanese: 400000,
      returnedToUserValue: 0,
      currencyRate: 89500
    },
    items: [
      {
        itemId: '1',
        itemNameEn: 'Espresso',
        itemNameAr: 'إسبريسو',
        sellingPrice: 3.5,
        quantity: 2,
        itemDiscount: 0,
        isDiscountPercent: true,
        subTotal: 7
      },
      {
        itemId: '2',
        itemNameEn: 'Croissant',
        itemNameAr: 'كرواسون',
        sellingPrice: 4,
        quantity: 1,
        itemDiscount: 10,
        isDiscountPercent: true,
        subTotal: 3.6
      },
      {
        itemId: '3',
        itemNameEn: 'Orange Juice',
        itemNameAr: 'عصير برتقال',
        sellingPrice: 5,
        quantity: 3,
        itemDiscount: 0,
        isDiscountPercent: true,
        subTotal: 15
      }
    ],
    itemsSubtotal: 25.6
  }
}
