import React, { useEffect, useState } from 'react';
import api from '../utils/api';
import { Trash2, Edit, Plus, ArrowLeft , Shield} from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const ManageUsers = () => {
  const navigate = useNavigate();
  const [users, setUsers] = useState([]);
  const [form, setForm] = useState({ email: '', password: '', department: '' });
  const [editingId, setEditingId] = useState(null);

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    const res = await api.get('/admin/users');
    setUsers(res.data);
  };

  const handleSubmit = async () => {
    if (editingId) {
      await api.put(`/admin/users/${editingId}`, form);
    } else {
      await api.post('/admin/users', form);
    }
    setForm({ email: '', password: '', department: '' });
    setEditingId(null);
    fetchUsers();
  };

  const handleEdit = (user) => {
    setForm({ email: user.email, password: '', department: user.department });
    setEditingId(user.id);
  };

  const handleDelete = async (id) => {
    await api.delete(`/admin/users/${id}`);
    fetchUsers();
  };

  return (
        <div className="p-8 max-w-6xl mx-auto">
            {/* Header like Manage Access */}
            <header className="relative z-10 p-6 flex items-center gap-3 border-b border-white/10 mb-6">
            <button
                onClick={() => navigate('/admin/dashboard')}
                className="p-2 rounded-lg hover:bg-white/10"
            >
                <ArrowLeft className="w-5 h-5" />
            </button>

            <Shield className="w-6 h-6 text-primary" />
            <h1 className="text-2xl font-heading font-bold gradient-text">
                Manage Users
            </h1>
            </header>

            
        <div className="glass p-6 rounded-2xl mb-6">


        <div className="grid grid-cols-3 gap-4">
          <input placeholder="Email" value={form.email} onChange={e=>setForm({...form,email:e.target.value})} className="input text-black" />
          <input placeholder="Password" value={form.password} onChange={e=>setForm({...form,password:e.target.value})} className="input text-black" />
          <select
            value={form.department}
            onChange={e => setForm({ ...form, department: e.target.value })}
            className="input text-black"
            >
            <option value="">Select Department</option>
            <option value="Engineering">Engineering</option>
            <option value="Research">Research</option>
            <option value="Marketing">Marketing</option>
            <option value="Sales">Sales</option>
            <option value="HR">HR</option>
            <option value="Finance">Finance</option>
            </select>

        </div>

        <button onClick={handleSubmit} className="mt-4 px-6 py-2 rounded-xl bg-primary text-white flex items-center gap-2">
          <Plus /> {editingId ? 'Update User' : 'Add User'}
        </button>
      </div>

      <div className="glass p-6 rounded-2xl">
        <table className="w-full text-left">
          <thead>
            <tr>
              <th>Email</th>
              <th>Department</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {users.map(u => (
              <tr key={u.id} className="border-t border-white/10">
                <td>{u.email}</td>
                <td>{u.department}</td>
                <td className="flex gap-2">
                  <button onClick={()=>handleEdit(u)}><Edit /></button>
                  <button onClick={()=>handleDelete(u.id)} className="text-red-500"><Trash2 /></button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default ManageUsers;
