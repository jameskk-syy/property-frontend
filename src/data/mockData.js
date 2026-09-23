export const properties = [

]

export const units = [
  
]

export const tenants = [

]

export const payments = [

]

export const arrears = [
 
]

export const landlords = [
  
]

export const caretakers = [
 
]

export const vacancies = [
  
]

export const documents = [

]

export const constructionProjects = [
 
]

export const salaries = [
  
]

export const expenses = [
]

export const whatsappThreads = [
  
]

export const notifications = [

]

export const auditLog = [
  
]

export const revenueTrend = [
  
]

export const occupancyBreakdown = [

]

export const tenantLease = {
  property: '',
  unit: '',
  rent: 0,
  deposit: 0,
  leaseStart: '',
  leaseEnd: '',
  landlord: '',
  caretaker: '',
  balance: 0,
}

export const tenantPaymentHistory = [
]

export function formatKsh(amount) {
  return `KSh ${Number(amount).toLocaleString('en-KE')}`
}
