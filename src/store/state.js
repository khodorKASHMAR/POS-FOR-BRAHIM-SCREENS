import { defineStore } from 'pinia'
import CategoryService from '../services/CategoryService'
import CurrencyRateService from '../services/CurrencyRateService'
import { CurrencyEnum } from '../constants/enums'

let dollarRateRequest = null

export const useState = defineStore('ui', {
  state: () => {
    const savedLang = localStorage.getItem('lang')
    const savedCurrency = localStorage.getItem('currency')
    return {
      lang: savedLang || 'en',
      currency: savedCurrency || 'USD',
      sidebar: false,
      exchangeRate: Number(localStorage.getItem('exchangeRate')),
      categories: [],
      categoriesLoading: false
    }
  },
  getters: {
    dir: (s) => (s.lang === 'ar' ? 'rtl' : 'ltr')
  },
  actions: {
    toggleLang() {
      this.lang = this.lang === 'en' ? 'ar' : 'en'
      localStorage.setItem('lang', this.lang)
      document.documentElement.setAttribute('dir', this.dir)
    },
    toggleCurrency() {
      this.currency = this.currency === 'USD' ? 'LBP' : 'USD'
      localStorage.setItem('currency', this.currency)
    },
    async fetchDollarRate() {
      if (!dollarRateRequest) {
        dollarRateRequest = (async () => {
          try {
            const response = await CurrencyRateService.getRate(CurrencyEnum.LBP)
            const rate = Number(response?.data?.data?.rate) || 15000
            this.exchangeRate = rate
            localStorage.setItem('exchangeRate', rate.toString())
          } catch (error) {
            console.error('Error loading currency rate:', error)
          } finally {
            dollarRateRequest = null
          }
        })()
      }
      return dollarRateRequest
    },

    async loadCategories() {
      this.categoriesLoading = true
      try {
        const response = await CategoryService.getUserCategories()
        this.categories = (response?.data?.data || []).map((c) => ({
          id: c.id,
          nameAr: c.nameAr || '',
          nameEn: c.nameEn || ''
        }))
      } catch (error) {
        console.error('Error loading categories:', error)
      } finally {
        this.categoriesLoading = false
      }
    }
  }
})
