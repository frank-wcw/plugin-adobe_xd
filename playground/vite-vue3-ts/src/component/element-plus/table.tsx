import {type FunctionalComponent} from 'vue'
import { ElTable, ElTableColumn } from 'element-plus'

interface TableItem {
  date: string
  name: string
  address: string
}

type TableColumnScope = {
  row: TableItem
  $index: number
}

const ElementPlusTableTsx: FunctionalComponent = () => {
  const tableData: TableItem[] = [
    {
      date: '2016-05-03',
      name: 'Tom',
      address: 'No. 189, Grove St, Los Angeles',
    },
    {
      date: '2016-05-02',
      name: 'Tom',
      address: 'No. 189, Grove St, Los Angeles',
    },
    {
      date: '2016-05-04',
      name: 'Tom',
      address: 'No. 189, Grove St, Los Angeles',
    },
    {
      date: '2016-05-01',
      name: 'Tom',
      address: 'No. 189, Grove St, Los Angeles',
    },
  ]

  return (
    <ElTable data={tableData} style={{ width: '100%' }}>
      <ElTableColumn label="Date" width={180}>
        {{
          default: (scope: TableColumnScope) => (
            <span>{scope.row.date}</span>
          )
        }}
      </ElTableColumn>
      <ElTableColumn prop="name" label="Name" width={180} />
      <ElTableColumn prop="address" label="Address" />
    </ElTable>
  )
}

export default ElementPlusTableTsx