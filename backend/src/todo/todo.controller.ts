import { Controller, Get, Post, Patch, Delete, Param, Body, Query } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { TodoService } from './todo.service';
import { CreateTodoDto, UpdateTodoDto } from './todo.dto';

@ApiTags('Todo')
@Controller('todo')
export class TodoController {
  constructor(private readonly service: TodoService) {}

  @Get()
  @ApiOperation({ summary: 'Récupère toutes les todos (filtre par date possible)' })
  findAll(@Query('date') date?: string) {
    return this.service.findAll(date);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.service.findOne(id);
  }

  @Post()
  @ApiOperation({ summary: 'Crée une nouvelle todo' })
  create(@Body() body: CreateTodoDto) {
    return this.service.create(body);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() body: UpdateTodoDto) {
    return this.service.update(id, body);
  }

  @Patch(':id/toggle')
  @ApiOperation({ summary: 'Bascule le statut complété/non complété' })
  toggle(@Param('id') id: string) {
    return this.service.toggleComplete(id);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.service.remove(id);
  }
}
