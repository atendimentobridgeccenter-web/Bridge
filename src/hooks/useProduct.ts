import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import type { Product } from '@/lib/types'

export function useProduct(id: string | undefined) {
  return useQuery({
    queryKey: ['product', id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('products')
        .select('*')
        .eq('id', id!)
        .single()
      if (error) throw error
      return data as Product
    },
    enabled: !!id && id !== 'new',
    staleTime: 60_000,
  })
}

export function useUpdateProduct() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, fields }: { id: string; fields: Partial<Product> }) => {
      const { data, error } = await supabase
        .from('products')
        .update(fields)
        .eq('id', id)
        .select()
        .single()
      if (error) throw error
      return data as Product
    },
    onSuccess: (updated) => {
      queryClient.setQueryData(['product', updated.id], updated)
    },
  })
}
