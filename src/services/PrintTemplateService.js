import PosAxios from './index.js'

export function getPrintTemplate(code) {
  return PosAxios.get(`/print-template/${encodeURIComponent(code)}`)
}

export function savePrintTemplate(code, payload) {
  return PosAxios.put(`/print-template/${encodeURIComponent(code)}`, payload)
}

export default {
  getPrintTemplate,
  savePrintTemplate
}
