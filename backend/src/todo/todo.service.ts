import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Todo, TodoCategory } from './todo.entity';

@Injectable()
export class TodoService {
  constructor(@InjectRepository(Todo) private repo: Repository<Todo>) {}

  findAll(date?: string): Promise<Todo[]> {
    const query = this.repo.createQueryBuilder('todo');
    if (date) query.where('todo.dueDate = :date', { date });
    return query.orderBy('todo.createdAt', 'ASC').getMany();
  }

  findOne(id: string): Promise<Todo | null> {
    return this.repo.findOneBy({ id });
  }

  create(data: Partial<Todo>): Promise<Todo> {
    const todo = this.repo.create(data);
    return this.repo.save(todo);
  }

  async update(id: string, data: Partial<Todo>): Promise<Todo> {
    const todo = await this.findOne(id);
    if (!todo) throw new NotFoundException(`Todo ${id} introuvable`);
    Object.assign(todo, data);
    return this.repo.save(todo);
  }

  async remove(id: string): Promise<void> {
    const todo = await this.findOne(id);
    if (!todo) throw new NotFoundException(`Todo ${id} introuvable`);
    await this.repo.remove(todo);
  }

  async toggleComplete(id: string): Promise<Todo> {
    const todo = await this.findOne(id);
    if (!todo) throw new NotFoundException(`Todo ${id} introuvable`);
    todo.completed = !todo.completed;
    return this.repo.save(todo);
  }
}
