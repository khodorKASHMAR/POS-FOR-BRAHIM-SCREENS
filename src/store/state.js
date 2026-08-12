
import { defineStore } from 'pinia'
import ItemService from '../services/ItemService'
import DollarRateService from '../services/DollarRateService'

export const useState = defineStore('ui',{
  state:()=> {
    const savedItems = localStorage.getItem('items')
    const savedLang = localStorage.getItem('lang')
    const savedCurrency = localStorage.getItem('currency')
    return {
      lang: savedLang || 'en',
      currency: savedCurrency || 'USD',
      sidebar: false,
      exchangeRate: Number(localStorage.getItem('exchangeRate')) || 15000, // LBP per USD
      items: savedItems ? JSON.parse(savedItems) : [],
      itemsLoaded: false,
      itemsLoading: false
    }
  },
  getters:{
    dir:(s)=> s.lang==='ar'?'rtl':'ltr'
  },
  actions:{
    toggleLang(){
      this.lang = this.lang==='en'?'ar':'en'
      localStorage.setItem('lang',this.lang)
      // Update document direction
      document.documentElement.setAttribute('dir', this.dir)
    },
    toggleCurrency(){
      this.currency = this.currency==='USD'?'LBP':'USD'
      localStorage.setItem('currency',this.currency)
    },
    async fetchDollarRate() {
      try {
        const response = await DollarRateService.getDollarRate()
        const rate = Number(response?.data?.data?.dollarRate) || 15000
        this.exchangeRate = rate
        localStorage.setItem('exchangeRate', rate.toString())
      } catch (error) {
        console.error('Error loading dollar rate:', error)
      }
    },
    async fetchUserItems({ force = false } = {}) {
      if (this.itemsLoaded && !force) return
      if (this.itemsLoading) return
      this.itemsLoading = true
      try {
        const response = await ItemService.getUserItems()
        const data = response?.data?.data || []
        // Store items as UserItemDTO (same as backend)
        this.items = data
        this.itemsLoaded = true
        localStorage.setItem('items', JSON.stringify(this.items))
      } catch (error) {
        console.error('Error loading user items:', error)
      } finally {
        this.itemsLoading = false
      }
    }
  }
})

