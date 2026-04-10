import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatPrice(n: number): string {
  return 'R$ ' + n.toFixed(2).replace('.', ',')
}

export function formatDate(d: Date): string {
  return d.toLocaleDateString('pt-BR', {
    weekday: 'long', day: 'numeric', month: 'long',
  })
}

export function formatDateShort(d: Date): string {
  return d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })
}

export function formatMonthYear(dateStr: string): string {
  const normalized = /^\d{4}-\d{2}-\d{2}$/.test(dateStr)
    ? `${dateStr}T00:00:00`
    : dateStr
  const d = new Date(normalized)
  if (Number.isNaN(d.getTime())) return dateStr
  return d.toLocaleDateString('pt-BR', { month: 'short', year: 'numeric' })
}

export function slugify(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')
}

export function initials(name: string): string {
  return name
    .split(' ')
    .map(w => w[0])
    .join('')
    .slice(0, 2)
    .toUpperCase()
}

export const MONTHS_PT = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro',
]

export const WEEKDAYS_PT  = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb']
export const WEEKDAYS_LONG_PT = [
  'Domingo', 'Segunda-feira', 'Terça-feira', 'Quarta-feira',
  'Quinta-feira', 'Sexta-feira', 'Sábado',
]

export function percentChange(current: number, previous: number): number {
  if (previous === 0) return current > 0 ? 100 : 0
  return Math.round(((current - previous) / previous) * 100)
}

export function formatPaymentMethod(method: string | null): string | null {
  switch (method) {
    case 'pix': return 'Pix'
    case 'credit_card': return 'Cartão de crédito'
    case 'debit_card': return 'Cartão de débito'
    case 'cash': return 'Dinheiro'
    default: return null
  }
}
