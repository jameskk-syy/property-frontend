import { Link } from 'react-router-dom'
import { Compass, ArrowLeft } from 'lucide-react'
import Button from '../../components/ui/Button'
import Card from '../../components/ui/Card'
import { useAuth } from '../../context/AuthContext'

export default function NotFound() {
  const { user } = useAuth()
  const homePath = user ? `/${user.role}` : '/login'
  const homeLabel = user ? 'Back to Dashboard' : 'Go to Login'

  return (
    <div className="min-h-screen flex items-center justify-center p-6 bg-slate-50">
      <Card className="max-w-md w-full text-center p-8">
        <div className="w-16 h-16 rounded-2xl bg-brand-50 text-brand-600 flex items-center justify-center mx-auto mb-5 ring-8 ring-brand-50/50">
          <Compass size={32} />
        </div>
        <p className="text-5xl font-bold text-slate-900 tracking-tight mb-1">404</p>
        <h1 className="text-lg font-semibold text-slate-800 mb-2">Page not found</h1>
        <p className="text-sm text-slate-500 mb-6">
          The page you&apos;re looking for doesn&apos;t exist or may have been moved.
        </p>
        <Link to={homePath}>
          <Button icon={ArrowLeft}>{homeLabel}</Button>
        </Link>
      </Card>
    </div>
  )
}
