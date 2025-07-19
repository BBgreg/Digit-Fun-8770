import { useState, useEffect, useCallback } from 'react'
import supabase from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'

export const usePhoneNumbers = () => {
  const [phoneNumbers, setPhoneNumbers] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const { user } = useAuth()

  const fetchPhoneNumbers = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)
      
      if (!user) {
        setPhoneNumbers([])
        return
      }

      const { data, error: fetchError } = await supabase
        .from('user_phone_numbers')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })

      if (fetchError) throw fetchError

      setPhoneNumbers(data || [])
    } catch (err) {
      console.error('Error fetching phone numbers:', err)
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }, [user])

  const addPhoneNumber = async (contactName, phoneNumberDigits) => {
    try {
      setError(null)
      
      if (!user) throw new Error('You must be logged in to add numbers')

      const cleanDigits = phoneNumberDigits.replace(/\D/g, '')
      if (cleanDigits.length !== 10) {
        throw new Error('Phone number must be exactly 10 digits')
      }

      const { data, error: insertError } = await supabase
        .from('user_phone_numbers')
        .insert([{
          user_id: user.id,
          contact_name: contactName,
          phone_number_digits: cleanDigits
        }])
        .select()
        .single()

      if (insertError) throw insertError

      await fetchPhoneNumbers()
      return { success: true, data }
    } catch (err) {
      console.error('Error adding phone number:', err)
      setError(err.message)
      return { success: false, error: err.message }
    }
  }

  const updatePhoneNumber = async (id, contactName, phoneNumberDigits) => {
    try {
      setError(null)
      
      if (!user) throw new Error('You must be logged in to update numbers')

      const cleanDigits = phoneNumberDigits.replace(/\D/g, '')
      if (cleanDigits.length !== 10) {
        throw new Error('Phone number must be exactly 10 digits')
      }

      const { data, error: updateError } = await supabase
        .from('user_phone_numbers')
        .update({
          contact_name: contactName,
          phone_number_digits: cleanDigits,
          updated_at: new Date().toISOString()
        })
        .eq('id', id)
        .eq('user_id', user.id)
        .select()
        .single()

      if (updateError) throw updateError

      await fetchPhoneNumbers()
      return { success: true, data }
    } catch (err) {
      console.error('Error updating phone number:', err)
      setError(err.message)
      return { success: false, error: err.message }
    }
  }

  const deletePhoneNumber = async (id) => {
    try {
      setError(null)
      
      if (!user) throw new Error('You must be logged in to delete numbers')

      const { error: deleteError } = await supabase
        .from('user_phone_numbers')
        .delete()
        .eq('id', id)
        .eq('user_id', user.id)

      if (deleteError) throw deleteError

      await fetchPhoneNumbers()
      return { success: true }
    } catch (err) {
      console.error('Error deleting phone number:', err)
      setError(err.message)
      return { success: false, error: err.message }
    }
  }

  useEffect(() => {
    fetchPhoneNumbers()
  }, [fetchPhoneNumbers])

  return {
    phoneNumbers,
    loading,
    error,
    addPhoneNumber,
    updatePhoneNumber,
    deletePhoneNumber,
    refetch: fetchPhoneNumbers
  }
}