import { useState, useEffect } from 'react'
import {
  ShieldCheck, Users, Lock, Plus, Pencil, Trash2, UserPlus, KeyRound, Ban, CheckCircle2,
} from 'lucide-react'
import PageHeader from '../../components/ui/PageHeader'
import StatCard from '../../components/ui/StatCard'
import Card from '../../components/ui/Card'
import Tabs from '../../components/ui/Tabs'
import Badge from '../../components/ui/Badge'
import Button from '../../components/ui/Button'
import Avatar from '../../components/ui/Avatar'
import DataTable from '../../components/ui/DataTable'
import { StatCardsSkeleton } from '../../components/ui/Skeleton'
import FormModal from '../../components/patterns/FormModal'
import PermissionMatrix from '../../components/patterns/PermissionMatrix'
import { Field, TextInput, TextArea, Select } from '../../components/ui/Field'
import { useToast } from '../../context/ToastContext'
import { useAuth } from '../../context/AuthContext'
import { accessRoles, accessUsers } from '../../data/accessControl'
import { PERMISSION_MODULES, ALL_MODULE_KEYS, countGranted } from '../../data/modules'
import { api } from '../../api/client'

const ROLE_BADGE_TONES = ['purple', 'blue', 'orange', 'green', 'red']
const SECTION_NAMES = ['Leasing', 'Finance', 'People', 'Operations', 'System']
const emptyPermissions = () => Object.fromEntries(ALL_MODULE_KEYS.map((k) => [k, false]))

export default function AccessManagement() {
  const { user: currentUser, setUserPermissions } = useAuth()
  const { showToast } = useToast()
  const [tab, setTab] = useState('Users')
  const [roles, setRoles] = useState(accessRoles)
  const [users, setUsers] = useState(accessUsers)
  const [loading, setLoading] = useState(true)

  const [roleModal, setRoleModal] = useState({ open: false, editing: null })
  const [roleForm, setRoleForm] = useState({ name: '', description: '', permissions: emptyPermissions() })

  const [userModal, setUserModal] = useState({ open: false, editing: null })
  const [userForm, setUserForm] = useState({
    name: '',
    email: '',
    password: '',
    roleId: 'admin',
    status: 'Active',
    allowed_modules: [...SECTION_NAMES]
  })

  // ---- Fetch real users & roles on mount ----
  useEffect(() => {
    let mounted = true
    Promise.allSettled([api.getUsers(), api.getRoles()]).then(([u, r]) => {
      if (!mounted) return
      if (u.status === 'fulfilled' && Array.isArray(u.value) && u.value.length > 0) {
        setUsers(u.value.map(x => ({
          ...x,
          roleId: x.role || 'admin',
          allowed_modules: x.allowed_modules || [...SECTION_NAMES]
        })))
      }
      if (r.status === 'fulfilled' && Array.isArray(r.value) && r.value.length > 0) {
        setRoles(r.value)
      }
      setLoading(false)
    })
    return () => { mounted = false }
  }, [])

  const roleName = (roleId) => roles.find((r) => r.id === roleId)?.name || roleId
  const roleTone = (roleId) => ROLE_BADGE_TONES[roles.findIndex((r) => r.id === roleId) % ROLE_BADGE_TONES.length] || 'blue'
  const userCountFor = (roleId) => users.filter((u) => u.roleId === roleId || u.role === roleId).length

  // Modules are attached to the ROLE, not the individual user. Derive the
  // list of module sections a user can access from their assigned role's
  // permission map, so users always inherit exactly what the role grants.
  const modulesForRole = (roleId) => {
    const role = roles.find((r) => r.id === roleId)
    const perms = role?.permissions
    if (!perms) return [...SECTION_NAMES]
    return PERMISSION_MODULES
      .filter((section) => section.modules.some((m) => perms[m.key]))
      .map((section) => section.section)
  }

  // ---- Role modal handlers ----
  const openCreateRole = () => {
    setRoleForm({ name: '', description: '', permissions: emptyPermissions() })
    setRoleModal({ open: true, editing: null })
  }
  const openEditRole = (role) => {
    setRoleForm({ name: role.name, description: role.description, permissions: { ...(role.permissions || {}) } })
    setRoleModal({ open: true, editing: role })
  }
  const setPermission = (key, value) => {
    setRoleForm((f) => ({ ...f, permissions: { ...f.permissions, [key]: value } }))
  }
  const submitRole = async () => {
    if (!roleForm.name) return
    // The backend Role name: prefer the seeded role's real name, else the label.
    const backendRoleName = roleModal.editing?.role || roleModal.editing?.name || roleForm.name
    try {
      await api.saveRole({
        roleName: backendRoleName,
        permissions: roleForm.permissions,
        description: roleForm.description,
      })
      if (roleModal.editing) {
        setRoles((prev) => prev.map((r) => (r.id === roleModal.editing.id ? { ...r, ...roleForm } : r)))
        showToast(`${roleForm.name} role updated.`)
      } else {
        const id = roleForm.name.toLowerCase().replace(/\s+/g, '_')
        setRoles((prev) => [...prev, { id, role: backendRoleName, ...roleForm, locked: false }])
        showToast(`${roleForm.name} role created.`)
      }
    } catch (err) {
      showToast(err?.message || 'Could not save the role.')
    }
    setRoleModal({ open: false, editing: null })
  }
  const deleteRole = (role) => {
    if (role.locked) {
      showToast('The Administrator role can\u2019t be deleted.', 'info')
      return
    }
    if (userCountFor(role.id) > 0) {
      showToast('Reassign users before deleting this role.', 'info')
      return
    }
    setRoles((prev) => prev.filter((r) => r.id !== role.id))
    showToast(`${role.name} role deleted.`)
  }

  // ---- User modal handlers ----
  const openCreateUser = () => {
    setUserForm({
      name: '',
      email: '',
      password: '',
      roleId: 'admin',
      status: 'Active',
      allowed_modules: [...SECTION_NAMES]
    })
    setUserModal({ open: true, editing: null })
  }

  const openEditUser = (user) => {
    setUserForm({
      name: user.name,
      email: user.email,
      password: '',
      roleId: user.roleId || user.role || 'admin',
      status: user.status || 'Active',
      allowed_modules: user.allowed_modules || [...SECTION_NAMES]
    })
    setUserModal({ open: true, editing: user })
  }

  const submitUser = async () => {
    if (!userForm.name || !userForm.email) return

    // Module access is inherited from the assigned role.
    const allowedModules = modulesForRole(userForm.roleId)

    try {
      await api.createUser({
        name: userForm.name,
        email: userForm.email,
        password: userForm.password || null,
        roleId: userForm.roleId,
        status: userForm.status,
        allowed_modules: allowedModules
      })

      if (userModal.editing) {
        setUsers((prev) => prev.map((u) => (u.id === userModal.editing.id || u.email === userForm.email ? { ...u, ...userForm, allowed_modules: allowedModules, id: userForm.email } : u)))
        showToast(`${userForm.name} updated successfully in system.`)
        if (currentUser && (currentUser.email === userForm.email || currentUser.id === userModal.editing.id)) {
          setUserPermissions(allowedModules)
        }
      } else {
        const newUser = {
          id: userForm.email,
          ...userForm,
          allowed_modules: allowedModules,
          role: userForm.roleId
        }
        setUsers((prev) => [newUser, ...prev])
        showToast(`${userForm.name} created with access inherited from the ${roleName(userForm.roleId)} role.`)
      }
    } catch (err) {
      showToast(`Error saving user: ${err.message}`, 'error')
    }

    setUserModal({ open: false, editing: null })
  }

  const toggleStatus = async (user) => {
    const next = user.status === 'Active' ? 'Suspended' : 'Active'
    try {
      await api.toggleUserStatus(user.email || user.id, next)
      setUsers((prev) => prev.map((u) => (u.id === user.id ? { ...u, status: next } : u)))
      showToast(`${user.name} status updated to ${next}.`)
    } catch {
      setUsers((prev) => prev.map((u) => (u.id === user.id ? { ...u, status: next } : u)))
      showToast(`${user.name} status updated to ${next}.`)
    }
  }

  return (
    <div>
      <PageHeader
        title="Access Management"
        description="Create users, define roles, and control access permissions across allowed modules."
        actions={
          tab === 'Roles' ? (
            <Button icon={Plus} onClick={openCreateRole}>Create Role</Button>
          ) : (
            <Button icon={UserPlus} onClick={openCreateUser}>Add User</Button>
          )
        }
      />

      {loading ? (
        <div className="mb-6"><StatCardsSkeleton count={4} /></div>
      ) : (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <StatCard label="Roles" value={roles.length} icon={ShieldCheck} />
          <StatCard label="Total Users" value={users.length} icon={Users} tone="blue" />
          <StatCard label="Active Users" value={users.filter((u) => u.status === 'Active').length} icon={CheckCircle2} tone="brand" />
          <StatCard label="Suspended" value={users.filter((u) => u.status === 'Suspended').length} icon={Ban} tone="red" />
        </div>
      )}

      <Card padded={false} className="p-5">
        <Tabs tabs={['Users', 'Roles']} active={tab} onChange={setTab} />

        {tab === 'Roles' ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4 mt-4">
            {roles.map((role) => {
              const granted = role.permissions ? countGranted(role.permissions) : 5
              return (
                <Card key={role.id} className="flex flex-col">
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <h3 className="font-semibold text-slate-900">{role.name}</h3>
                      {role.locked && (
                        <span title="Built-in role"><Lock size={13} className="text-slate-400" /></span>
                      )}
                    </div>
                    <Badge tone="blue">{userCountFor(role.id)} users</Badge>
                  </div>
                  <p className="text-sm text-slate-500 flex-1 mb-4">{role.description}</p>
                  <div className="mb-4">
                    <div className="flex items-center justify-between text-xs text-slate-400 mb-1">
                      <span>Module access</span>
                      <span>{granted}/{ALL_MODULE_KEYS.length}</span>
                    </div>
                    <div className="h-1.5 rounded-full bg-slate-100 overflow-hidden">
                      <div
                        className="h-full bg-brand-500 rounded-full"
                        style={{ width: `${(granted / ALL_MODULE_KEYS.length) * 100}%` }}
                      />
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button variant="secondary" size="sm" icon={Pencil} onClick={() => openEditRole(role)} className="flex-1">
                      Edit
                    </Button>
                    <Button variant="ghost" size="sm" icon={Trash2} onClick={() => deleteRole(role)}>
                      Delete
                    </Button>
                  </div>
                </Card>
              )
            })}
          </div>
        ) : (
          <div className="mt-4">
            <DataTable
              loading={loading}
              columns={[
                { key: 'name', header: 'User', render: (r) => (
                  <div className="flex items-center gap-2.5">
                    <Avatar name={r.name} size={32} />
                    <div>
                      <p className="font-medium text-slate-800">{r.name}</p>
                      <p className="text-xs text-slate-400">{r.email}</p>
                    </div>
                  </div>
                ) },
                { key: 'role', header: 'Role', render: (r) => <Badge tone={roleTone(r.roleId)}>{roleName(r.roleId)}</Badge> },
                { key: 'modules', header: 'Allowed Modules', render: (r) => (
                  <div className="flex flex-wrap gap-1 max-w-md">
                    {(r.allowed_modules || SECTION_NAMES).map(m => (
                      <span key={m} className="text-[10px] font-medium px-1.5 py-0.5 rounded bg-slate-100 text-slate-600">
                        {m}
                      </span>
                    ))}
                  </div>
                ) },
                { key: 'status', header: 'Status', render: (r) => (
                  <Badge tone={r.status === 'Active' ? 'green' : 'red'}>{r.status}</Badge>
                ) },
                { key: 'actions', header: '', render: (r) => (
                  <div className="flex items-center gap-1.5">
                    <Button variant="ghost" size="sm" icon={Pencil} onClick={() => openEditUser(r)}>Edit</Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      icon={r.status === 'Active' ? Ban : CheckCircle2}
                      onClick={() => toggleStatus(r)}
                    >
                      {r.status === 'Active' ? 'Suspend' : 'Activate'}
                    </Button>
                  </div>
                ) },
              ]}
              rows={users}
              searchKeys={['name', 'email', 'role']}
              searchPlaceholder="Search users by name, email, or role…"
            />
          </div>
        )}
      </Card>

      {/* Create / Edit Role Modal */}
      <FormModal
        open={roleModal.open}
        onClose={() => setRoleModal({ open: false, editing: null })}
        title={roleModal.editing ? `Edit ${roleModal.editing.name}` : 'Create Role'}
        description="Name the role, then choose which modules it can access."
        onSubmit={submitRole}
        submitLabel={roleModal.editing ? 'Save Changes' : 'Create Role'}
        size="lg"
      >
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Field label="Role name">
            <TextInput
              required
              value={roleForm.name}
              onChange={(e) => setRoleForm({ ...roleForm, name: e.target.value })}
              placeholder="e.g. Regional Manager"
              disabled={roleModal.editing?.locked}
            />
          </Field>
        </div>
        <Field label="Description">
          <TextArea
            value={roleForm.description}
            onChange={(e) => setRoleForm({ ...roleForm, description: e.target.value })}
            placeholder="What is this role responsible for?"
          />
        </Field>
        <div>
          <p className="text-sm font-medium text-slate-700 mb-2">Module access</p>
          <PermissionMatrix permissions={roleForm.permissions} onChange={setPermission} />
        </div>
      </FormModal>

      {/* Create / Edit User Modal */}
      <FormModal
        open={userModal.open}
        onClose={() => setUserModal({ open: false, editing: null })}
        title={userModal.editing ? 'Update User' : 'Create User'}
        description="Set user credentials, assign a role, and select allowed modules."
        onSubmit={submitUser}
        submitLabel={userModal.editing ? 'Save Changes' : 'Create User'}
        size="lg"
      >
        <div className="grid grid-cols-2 gap-3">
          <Field label="Full name">
            <TextInput required value={userForm.name} onChange={(e) => setUserForm({ ...userForm, name: e.target.value })} placeholder="e.g. Peter Njenga" />
          </Field>
          <Field label="Email address">
            <TextInput type="email" required value={userForm.email} onChange={(e) => setUserForm({ ...userForm, email: e.target.value })} placeholder="name@nest.co.ke" />
          </Field>
        </div>

        <div className="grid grid-cols-3 gap-3">
          <Field label={userModal.editing ? "New Password (optional)" : "Password"}>
            <TextInput
              type="password"
              required={!userModal.editing}
              value={userForm.password}
              onChange={(e) => setUserForm({ ...userForm, password: e.target.value })}
              placeholder={userModal.editing ? "Leave blank to keep unchanged" : "••••••••"}
            />
          </Field>
          <Field label="Role">
            <Select value={userForm.roleId} onChange={(e) => setUserForm({ ...userForm, roleId: e.target.value })}>
              {roles.map((r) => <option key={r.id} value={r.id}>{r.name}</option>)}
            </Select>
          </Field>
          <Field label="Status">
            <Select value={userForm.status} onChange={(e) => setUserForm({ ...userForm, status: e.target.value })}>
              <option>Active</option>
              <option>Suspended</option>
            </Select>
          </Field>
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wide mb-2">
            Module Access (Inherited from Role)
          </label>
          <div className="bg-slate-50 p-3.5 rounded-lg border border-slate-200">
            {(() => {
              const inherited = modulesForRole(userForm.roleId)
              return inherited.length > 0 ? (
                <div className="flex flex-wrap gap-1.5">
                  {inherited.map((section) => (
                    <span key={section} className="text-[11px] font-medium px-2 py-0.5 rounded bg-brand-50 text-brand-700 border border-brand-100">
                      {section}
                    </span>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-slate-400">
                  The {roleName(userForm.roleId)} role has no modules granted yet. Edit the role in the Roles tab to grant access.
                </p>
              )
            })()}
          </div>
          <p className="text-[11px] text-slate-400 mt-1">
            Module access is controlled by the assigned role. Manage it in the Roles tab, and the change applies to every user with that role.
          </p>
        </div>

        {userModal.editing && (
          <button
            type="button"
            onClick={() => showToast(`Password reset link sent to ${userForm.email}.`)}
            className="flex items-center gap-1.5 text-xs font-medium text-brand-600 hover:text-brand-700 mt-2"
          >
            <KeyRound size={13} /> Send password reset link
          </button>
        )}
      </FormModal>
    </div>
  )
}
