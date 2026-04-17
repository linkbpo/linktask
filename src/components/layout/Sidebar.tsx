import { Link, useLocation } from 'react-router-dom'
import { LayoutDashboard, LogOut } from 'lucide-react'
import { useAuth } from '../../contexts/AuthContext'

export default function Sidebar() {
  const { signOut } = useAuth()
  const location = useLocation()

  const links = [
    { to: '/', label: 'Dashboard', icon: LayoutDashboard },
  ]

  return (
    <aside className="w-60 bg-white border-r flex flex-col">
      <div className="p-4 border-b">
        <h1 className="text-xl font-bold text-indigo-600">linktask</h1>
        <p className="text-xs text-gray-400">by Enjoy</p>
      </div>
      <nav className="flex-1 p-3 space-y-1">
        {links.map(({ to, label, icon: Icon }) => (
          <Link
            key={to}
            to={to}
            className={`flex items-center gap-2 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
              location.pathname === to
                ? 'bg-indigo-50 text-indigo-600'
                : 'text-gray-600 hover:bg-gray-100'
            }`}
          >
            <Icon size={16} />
            {label}
          </Link>
        ))}
      </nav>
      <div className="p-3 border-t">
        <button
          onClick={signOut}
          className="flex items-center gap-2 w-full px-3 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-md"
        >
          <LogOut size={16} />
          Sair
        </button>
      </div>
    </aside>
  )
}
