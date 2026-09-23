import PageHeader from '../ui/PageHeader'
import StatCard from '../ui/StatCard'
import Card from '../ui/Card'
import DataTable from '../ui/DataTable'
import { StatCardsSkeleton } from '../ui/Skeleton'

/**
 * Nearly every "management" screen in the design set is the same shape:
 * a header with an action button, a row of stat cards, then a searchable
 * table. Rather than rebuild that per page, each page just configures this
 * template with its own data/columns — which is what keeps 20+ admin pages
 * small and consistent.
 */
export default function ListPageTemplate({
  title,
  description,
  actions,
  stats = [],
  columns,
  rows,
  searchKeys,
  searchPlaceholder,
  emptyMessage,
  tableActions,
  onRowClick,
  loading = false,
  children,
}) {
  return (
    <div>
      <PageHeader title={title} description={description} actions={actions} />

      {stats.length > 0 && (
        loading ? (
          <div className="mb-6"><StatCardsSkeleton count={stats.length} /></div>
        ) : (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            {stats.map((s) => (
              <StatCard key={s.label} {...s} />
            ))}
          </div>
        )
      )}

      {children}

      <Card padded={false} className="p-5">
        <DataTable
          columns={columns}
          rows={rows}
          searchKeys={searchKeys}
          searchPlaceholder={searchPlaceholder}
          emptyMessage={emptyMessage}
          rightActions={tableActions}
          onRowClick={onRowClick}
          loading={loading}
        />
      </Card>
    </div>
  )
}
